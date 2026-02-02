import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import { Job, JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const ASSESS_QUEUE = Symbol('ASSESS_QUEUE');
export const ASSESS_REDIS = Symbol('ASSESS_REDIS');
export const ASSESS_REDIS_EVENTS = Symbol('ASSESS_REDIS_EVENTS');

type ProgressPayload = {
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
    /**
     * FIX:
     * CLOVA는 QPS 제한이 엄격함
     * job 1개당 CLOVA 호출이 2회 이상이므로
     * concurrency=1 이 사실상 안전한 기본값
     */
    const concurrency = Number(process.env.ASSESS_WORKER_CONCURRENCY ?? '1');
    this.logger.log(`[worker:init] concurrency=${concurrency}`);

    this.worker = new Worker(
      this.queue.name,
      async (job) => {
        const answerId: number = job.data.answerId;
        await this.processJob(job, answerId);
      },
      { connection: this.redis, concurrency },
    );

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err?.message ?? err}`, err?.stack);
    });
  }

  async enqueue(answerId: number) {
    const opts: JobsOptions = {
      jobId: `answer-${answerId}`,
      removeOnComplete: true,

      /**
       * FIX:
       * rate limit(429) 발생 시
       * 1~2초 재시도는 의미 없음 → 계속 429
       * 최소 10~15초 대기 필요
       */
      attempts: 5,
      backoff: {
        type: 'fixed',
        delay: 15_000,
      },
    };

    const existing = await this.queue.getJob(String(opts.jobId));
    if (existing) return;

    await this.queue.add('assess', { answerId }, opts);
  }

  private async progress(job: Job, payload: ProgressPayload) {
    await job.updateProgress(payload);
  }

  private async processJob(job: Job, answerId: number) {
    const jobRow = await this.repo.getAssessmentJobByAnswerId(answerId);

    if (!jobRow) {
      this.logger.warn(`Job not found for answer ${answerId}`);
      await this.progress(job, {
        jobId: -1,
        answerId,
        status: AssessmentStatus.FAILED,
        timestamp: new Date().toISOString(),
        error: 'job_not_found',
      });
      return;
    }

    try {
      // ================== EVALUATING ==================
      await this.repo.updateAssessmentJob(jobRow.id, {
        status: AssessmentStatus.EVALUATING,
        startedAt: new Date(),
      });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.EVALUATING,
        timestamp: new Date().toISOString(),
      });

      await this.orchestrator.evaluate(answerId);

      // ================== FEEDBACKING ==================
      await this.repo.updateAssessmentJob(jobRow.id, {
        status: AssessmentStatus.FEEDBACKING,
      });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.FEEDBACKING,
        timestamp: new Date().toISOString(),
      });

      await this.orchestrator.buildFeedback(answerId);

      // ================== REWARDING ==================
      await this.repo.updateAssessmentJob(jobRow.id, {
        status: AssessmentStatus.REWARDING,
      });
      await this.progress(job, {
        jobId: jobRow.id,
        answerId,
        status: AssessmentStatus.REWARDING,
        timestamp: new Date().toISOString(),
      });

      // ================== DONE (TX) ==================
      await this.repo.withTransaction(async (tx) => {
        const answer = await tx.userAnswer.findUnique({
          where: { id: answerId },
          select: { userId: true },
        });
        if (!answer) throw new Error('ANSWER_NOT_FOUND');

        await this.userCreditsRepository.consumeIfEnough(answer.userId, 'FEEDBACK_CONSUME', 1, tx);

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
      });

      this.logger.log(`[job:done] jobId=${jobRow.id}, answerId=${answerId}`);

      return { answerId, jobDbId: jobRow.id };
    } catch (e: any) {
      const message = e?.message ?? 'unknown_error';

      /**
       * FIX (가장 중요):
       * CLOVA rate limit(429)는 실패가 아님
       * → 상태 변경 x
       * → progress x
       * → 그냥 throw 해서 BullMQ retry/backoff 맡김
       */
      if (e?.status === 429 || e?.response?.statusCode === 429) {
        this.logger.warn(`[job:rate-limit] jobId=${jobRow.id}, answerId=${answerId}`);
        throw e;
      }

      this.logger.error(
        `[job:failed] jobId=${jobRow.id}, answerId=${answerId}, error=${message}`,
        e?.stack,
      );

      // 진짜 실패만 FAILED 처리
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

      throw e;
    }
  }

  async onModuleDestroy() {
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
