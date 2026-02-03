import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from '../assessment.repository';
import type { AssessmentSseEventDTO } from '../dto/assessment-sse-event.dto';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import { Job, JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const ASSESS_QUEUE = Symbol('ASSESS_QUEUE');
export const ASSESS_REDIS = Symbol('ASSESS_REDIS');
export const ASSESS_REDIS_EVENTS = Symbol('ASSESS_REDIS_EVENTS'); // module에서 같이 씀

// BullMQ 작업 데이터 타입(큐에 넣는 데이터 구조)
type AssessJobData = { answerId: number };

@Injectable()
export class AssessmentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly repo: AssessmentRepository,
    private readonly orchestrator: EvaluationOrchestratorService,
    private readonly userCreditsRepository: UserCreditsRepository,
    private readonly config: ConfigService,
    @Inject(ASSESS_QUEUE) private readonly queue: Queue,
    @Inject(ASSESS_REDIS) private readonly redis: IORedis,
  ) {}

  onModuleInit() {
    // 동시 처리 개수 설정(기본 2). ConfigService 기반으로 읽음.
    const concurrency = Number(this.config.get<string>('ASSESS_WORKER_CONCURRENCY') ?? '2');

    // BullMQ Worker 생성: 큐에서 작업을 꺼내 처리
    this.worker = new Worker<AssessJobData>(
      this.queue.name,
      async (job: Job<AssessJobData>) => {
        const { answerId } = job.data;
        await this.processJob(job, answerId);
      },
      { connection: this.redis, concurrency },
    );

    // 런타임 에러 로깅(원인 추적 용이)
    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err?.message ?? err}`, err?.stack);
    });
  }

  /**
   * 큐에 평가 작업을 등록합니다.
   * - 동일 answerId에 대해 idempotent 하도록 고정 jobId(`answer-${answerId}`) 사용
   * - 이미 존재하면 중복 등록하지 않습니다.
   */
  async enqueue(answerId: number) {
    const opts: JobsOptions = {
      // SSE에서 answerId로 jobId를 역추적하기 위해 고정 id 사용
      jobId: `answer-${answerId}`,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    };
    // 중복 작업 방지(idempotency): 동일 jobId가 이미 존재하면 재등록하지 않음
    const existing = await this.queue.getJob(String(opts.jobId));
    if (existing) return;
    await this.queue.add('assess', { answerId } satisfies AssessJobData, opts);
  }

  /**
   * 진행상태(progress) 이벤트를 업데이트합니다.
   * - QueueEvents에서 이 데이터를 구독해 SSE로 전달합니다.
   */
  private async progress(job: Job<AssessJobData>, payload: AssessmentSseEventDTO) {
    await job.updateProgress(payload);
  }

  /**
   * 단일 평가 작업을 처리합니다.
   * - 상태 전이: EVALUATING → FEEDBACKING → REWARDING → DONE
   * - 각 상태 진입 시 progress 이벤트를 전송하여 실시간 상황을 알립니다.
   * - 실패 시 FAILED로 마킹하고 에러 메시지와 함께 progress를 전송합니다.
   */
  private async processJob(job: Job<AssessJobData>, answerId: number) {
    const jobRow = await this.repo.getAssessmentJobByAnswerId(answerId);
    if (!jobRow) {
      this.logger.warn(`Job not found for answer ${answerId}`);
      // job 자체는 끝내되, SSE쪽은 DB snapshot으로 처리하도록 둠
      await this.progress(job, {
        jobId: -1, // 알 수 없는 경우 -1 (클라이언트는 스냅샷으로 보정)
        answerId,
        status: AssessmentStatus.FAILED,
        timestamp: new Date().toISOString(),
        error: 'job_not_found',
      });
      return;
    }

    try {
      // EVALUATING
      await this.repo.updateAssessmentJob(jobRow.id, {
        status: AssessmentStatus.EVALUATING,
        startedAt: new Date(),
      });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.EVALUATING,
        timestamp: new Date().toISOString(),
        error: null,
      });

      await this.orchestrator.evaluate(answerId);

      // FEEDBACKING
      await this.repo.updateAssessmentJob(jobRow.id, { status: AssessmentStatus.FEEDBACKING });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.FEEDBACKING,
        timestamp: new Date().toISOString(),
        error: null,
      });

      await this.orchestrator.buildFeedback(answerId);

      // REWARDING (지금은 상태만 찍고 실제 보상 로직은 추후)
      await this.repo.updateAssessmentJob(jobRow.id, { status: AssessmentStatus.REWARDING });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.REWARDING,
        timestamp: new Date().toISOString(),
        error: null,
      });

      // ===== TRANSACTION: credit consume + DONE =====
      await this.repo.withTransaction(async (tx) => {
        // answer → userId
        const answer = await tx.userAnswer.findUnique({
          where: { id: answerId },
          select: { userId: true },
        });

        if (!answer) {
          throw new Error('ANSWER_NOT_FOUND');
        }

        // credit consume (조건부)
        await this.userCreditsRepository.consumeIfEnough(answer.userId, 'FEEDBACK_CONSUME', 1, tx);

        // DONE
        await tx.assessmentJob.update({
          where: { id: jobRow.id },
          data: {
            status: AssessmentStatus.DONE,
            finishedAt: new Date(),
          },
        });
      });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.DONE,
        timestamp: new Date().toISOString(),
        error: null,
      });

      // completed 이벤트 returnvalue로도 SSE에 내려보낼 수 있음
      return { answerId, jobDbId: jobRow.id };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      await this.repo.updateAssessmentJob(jobRow.id, {
        status: AssessmentStatus.FAILED,
        error: message,
        finishedAt: new Date(),
      });

      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.FAILED,
        timestamp: new Date().toISOString(),
        error: message,
      });

      // 실패는 throw로 넘겨야 BullMQ failed 이벤트도 발생
      throw e;
    }
  }

  async onModuleDestroy() {
    // 종료 시 예외가 나더라도 안전하게 무시하고 로그만 남김
    try {
      await this.worker?.close();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Worker close failed: ${message}`);
    }
    try {
      await this.queue.close();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Queue close failed: ${message}`);
    }
  }
}
