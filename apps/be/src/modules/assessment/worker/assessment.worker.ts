// 평가 파이프라인 워커(BullMQ 기반)
// - 분리 워커 전용: 평가→피드백→보상 단계를 개별 큐/워커로 병렬 처리
// - 전역 레이트리밋(토큰 버킷)으로 LLM QPM 스파이크를 완화합니다.
// - ASSESS_ENABLE_WORKERS=0 이면 워커를 기동하지 않아 API 전용 프로세스로 사용할 수 있습니다.
// - 진행상태(progress)는 SSE로 전파되며, answerId 기반 고정 jobId로 멱등성을 보장합니다.
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

import { AssessmentRepository } from '../assessment.repository';
import type { AssessmentSseEventDTO } from '../dto/assessment-sse-event.dto';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import {
  ASSESS_EVAL_QUEUE,
  ASSESS_FB_QUEUE,
  ASSESS_REDIS,
  ASSESS_REWARD_QUEUE,
} from './assessment.tokens';
import { TokenBucketService } from './limiter/token-bucket.service';
import { handleEvaluateStage } from './stages/evaluate.stage';
import { handleFeedbackStage } from './stages/feedback.stage';
import { handleRewardStage } from './stages/reward.stage';
import { jobIdStage, updateProgress } from './utils/worker.utils';
import { Job, JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// 주입 토큰(ASSESS_*)은 assessment.tokens.ts에 정의되어 있습니다.

// BullMQ 작업 데이터 타입(큐에 넣는 데이터 구조)
type AssessJobData = { answerId: number };

@Injectable()
export class AssessmentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentWorker.name);
  private evalWorker: Worker | null = null;
  private fbWorker: Worker | null = null;
  private rewardWorker: Worker | null = null;

  constructor(
    private readonly repo: AssessmentRepository,
    private readonly orchestrator: EvaluationOrchestratorService,
    private readonly userCreditsRepository: UserCreditsRepository,
    private readonly config: ConfigService,
    @Inject(ASSESS_EVAL_QUEUE) private readonly evalQueue: Queue,
    @Inject(ASSESS_FB_QUEUE) private readonly fbQueue: Queue,
    @Inject(ASSESS_REWARD_QUEUE) private readonly rewardQueue: Queue,
    @Inject(ASSESS_REDIS) private readonly redis: IORedis,
    private readonly limiter: TokenBucketService,
  ) {}

  /**
   * 워커 초기화
   * - 환경변수 `ASSESS_ENABLE_WORKERS` 로 워커 기동 여부 제어(0이면 스킵)
   * - 평가/피드백/보상 각 단계 전용 BullMQ 워커를 동시성 설정과 함께 생성
   * - 오류는 각 워커별로 로깅하여 디버깅 용이성 확보
   */
  onModuleInit() {
    // Always start workers in the worker process (API/worker 분리 운영)

    // 연결/동시성 설정 로그와 Redis 헬스체크(초기 진단 편의)
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
    const evalConc = Number(this.config.get<string>('ASSESS_EVAL_CONCURRENCY') ?? '3');
    const fbConc = Number(this.config.get<string>('ASSESS_FB_CONCURRENCY') ?? '1');
    const rewardConc = Number(this.config.get<string>('ASSESS_REWARD_CONCURRENCY') ?? '10');

    this.logger.log(
      `Assessment workers starting: redisUrl=${redisUrl} concurrencies={eval:${evalConc}, fb:${fbConc}, reward:${rewardConc}}`,
    );

    // Redis 핑으로 조기 연결 확인(실패 시 이후 BullMQ에서도 동일하게 실패하므로, 원인 파악 로그만 남김)
    this.redis
      .ping()
      .then((pong) => this.logger.log(`Redis ping OK: ${pong}`))
      .catch((err) =>
        this.logger.error(
          `Redis ping failed: ${err?.message ?? err}. Check REDIS_URL/port/firewall/docker port mapping.`,
        ),
      );

    // Split-flow: 단계별 큐/워커 등록 (평가 → 피드백 → 보상)
    // 각 단계는 별도 동시성 설정을 가질 수 있어, 단계별 병목을 독립적으로 조정 가능

    this.evalWorker = new Worker<AssessJobData>(
      this.evalQueue.name,
      async (job: Job<AssessJobData>) => {
        await this.handleEvaluate(job);
      },
      { connection: this.redis, concurrency: evalConc },
    );
    this.evalWorker.on('error', (err) =>
      this.logger.error(`[EvaluateWorker] ${err?.message ?? err}`, err?.stack),
    );

    this.fbWorker = new Worker<AssessJobData>(
      this.fbQueue.name,
      async (job: Job<AssessJobData>) => {
        await this.handleFeedback(job);
      },
      { connection: this.redis, concurrency: fbConc },
    );
    this.fbWorker.on('error', (err) =>
      this.logger.error(`[FeedbackWorker] ${err?.message ?? err}`, err?.stack),
    );

    this.rewardWorker = new Worker<AssessJobData>(
      this.rewardQueue.name,
      async (job: Job<AssessJobData>) => {
        await this.handleReward(job);
      },
      { connection: this.redis, concurrency: rewardConc },
    );
    this.rewardWorker.on('error', (err) =>
      this.logger.error(`[RewardWorker] ${err?.message ?? err}`, err?.stack),
    );
  }

  /**
   * 큐에 평가 작업을 등록합니다.
   * - 동일 answerId에 대해 idempotent 하도록 고정 jobId(`answer-${answerId}`) 사용
   * - 이미 존재하면 중복 등록하지 않습니다.
   * - evaluate 단계만 먼저 등록하고, 후속 단계는 각 핸들러에서 체이닝합니다.
   */
  /**
   * 작업 등록(enqueue)
   * - 항상 평가 단계부터 시작: jobId는 `answer-{answerId}:evaluate`
   * - 멱등성 보장: 동일 jobId가 이미 있으면 재등록하지 않음
   * - 재시도/백오프는 환경변수로 조절 가능
   */
  async enqueue(answerId: number) {
    // enqueue evaluate stage only (legacy 단일 큐는 제거)
    const jobId = jobIdStage(answerId, 'evaluate');
    const attempts = Number(this.config.get<string>('ASSESS_EVAL_ATTEMPTS') ?? '3');
    const backoff = Number(this.config.get<string>('ASSESS_EVAL_BACKOFF_MS') ?? '2000');
    const opts: JobsOptions = {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
      attempts,
      backoff: { type: 'exponential', delay: backoff },
    };
    // 중복은 BullMQ가 jobId 기준으로 거부 → 멱등 처리(성공으로 간주) + 로그 남김
    try {
      this.logger.log(
        `[Enqueue] evaluate requested: jobId=${jobId} answerId=${answerId} attempts=${attempts} backoff=${backoff}ms`,
      );
      await this.evalQueue.add('evaluate', { answerId }, opts);
      this.logger.log(`[Enqueue] evaluate success: jobId=${jobId} answerId=${answerId}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(message ?? '')) {
        this.logger.warn(
          `[Enqueue] duplicate jobId detected; skipping re-enqueue. jobId=${jobId} error=${message}`,
        );
        return; // idempotent
      }
      this.logger.error(`[Enqueue] evaluate failed: ${message}`);
      throw e;
    }
  }

  /**
   * 진행상태(progress) 이벤트를 업데이트합니다.
   * - QueueEvents에서 이 데이터를 구독해 SSE로 전달합니다.
   * - payload는 AssessmentSseEventDTO 형태를 따릅니다.
   */
  /**
   * 진행상태(progress) 업데이트
   * - BullMQ Job에 progress payload를 기록하고, QueueEvents에서 이를 구독해 SSE로 브로드캐스트합니다.
   */
  private async progress(job: Job<AssessJobData>, payload: AssessmentSseEventDTO) {
    await updateProgress(job, payload);
  }

  // ===== Split-flow Stage Handlers =====
  /**
   * 평가 단계 핸들러
   * - 상태를 EVALUATING으로 전이하고, LLM 호출 전 전역 레이트리밋(TokenBucket) 검사
   * - 완료 시 피드백 단계 잡을 체이닝 등록
   */
  private async handleEvaluate(job: Job<AssessJobData>) {
    return handleEvaluateStage(job, {
      repo: this.repo,
      orchestrator: this.orchestrator,
      config: this.config,
      fbQueue: this.fbQueue,
      logger: this.logger,
      limiter: this.limiter,
    });
  }

  /**
   * 피드백 단계 핸들러
   * - 상태를 FEEDBACKING으로 전이하고, 필요 시 LLM 호출에 레이트리밋 적용
   * - 완료 시 보상 단계 잡을 체이닝 등록
   */
  private async handleFeedback(job: Job<AssessJobData>) {
    return handleFeedbackStage(job, {
      repo: this.repo,
      orchestrator: this.orchestrator,
      config: this.config,
      rewardQueue: this.rewardQueue,
      logger: this.logger,
      limiter: this.limiter,
    });
  }

  /**
   * 보상 단계 핸들러
   * - 사용자 크레딧 차감과 DONE 마킹을 트랜잭션으로 처리하여 일관성을 보장
   */
  private async handleReward(job: Job<AssessJobData>) {
    return handleRewardStage(job, {
      repo: this.repo,
      userCreditsRepository: this.userCreditsRepository,
      logger: this.logger,
    });
  }

  /**
   * 워커/큐 종료 정리
   * - 앱 종료 시 워커와 큐 연결을 안전하게 닫습니다.
   */
  async onModuleDestroy() {
    // 종료 시 예외가 나더라도 안전하게 무시하고 로그만 남김
    try {
      await this.evalWorker?.close();
      await this.fbWorker?.close();
      await this.rewardWorker?.close();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Worker close failed: ${message}`);
    }
    try {
      await this.evalQueue.close();
      await this.fbQueue.close();
      await this.rewardQueue.close();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Queue close failed: ${message}`);
    }
  }
}
