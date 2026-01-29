import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import { Job, JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const ASSESS_QUEUE = Symbol('ASSESS_QUEUE');
export const ASSESS_REDIS = Symbol('ASSESS_REDIS');
export const ASSESS_REDIS_EVENTS = Symbol('ASSESS_REDIS_EVENTS'); // module에서 같이 씀

type ProgressPayload = {
  // 합의된 SSE DTO 정합성 유지를 위해 DB jobId(숫자)를 포함
  jobId: number;
  answerId: number;
  status: AssessmentStatus;
  timestamp: string;
  error?: string | null;
};

@Injectable()
export class AssessmentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly repo: AssessmentRepository,
    private readonly orchestrator: EvaluationOrchestratorService,
    private readonly userCreditsRepository: UserCreditsRepository,
    @Inject(ASSESS_QUEUE) private readonly queue: Queue,
    @Inject(ASSESS_REDIS) private readonly redis: IORedis,
  ) {}

  onModuleInit() {
    const concurrency = Number(process.env.ASSESS_WORKER_CONCURRENCY ?? '2');

    this.worker = new Worker(
      this.queue.name,
      async (job) => {
        const answerId: number = job.data.answerId;
        await this.processJob(job, answerId);
      },
      { connection: this.redis, concurrency },
    );

    // 운영에서 원인 추적이 쉬워짐
    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err?.message ?? err}`, err?.stack);
    });
  }

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
    await this.queue.add('assess', { answerId }, opts);
  }

  private async progress(job: Job, payload: ProgressPayload) {
    // BullMQ progress 이벤트로 흘러가며 QueueEvents에서 수신 가능
    await job.updateProgress(payload);
  }

  private async processJob(job: Job, answerId: number) {
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
    } catch (e: any) {
      const message = e?.message ?? 'unknown_error';

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
    } catch (e: any) {
      this.logger.warn(`Worker close failed: ${e?.message ?? e}`);
    }
    try {
      await (this.queue as any)?.close?.();
    } catch (e: any) {
      this.logger.warn(`Queue close failed: ${e?.message ?? e}`);
    }
  }
}
