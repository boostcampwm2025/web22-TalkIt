import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import { AssessmentPubSub } from '../pubsub/assessment.pubsub';
import { JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export const ASSESS_QUEUE = Symbol('ASSESS_QUEUE');
export const ASSESS_REDIS = Symbol('ASSESS_REDIS');

@Injectable()
export class AssessmentWorker implements OnModuleDestroy {
  private readonly logger = new Logger(AssessmentWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly repo: AssessmentRepository,
    private readonly pubsub: AssessmentPubSub,
    private readonly orchestrator: EvaluationOrchestratorService,
    @Inject(ASSESS_QUEUE) private readonly queue: Queue,
    @Inject(ASSESS_REDIS) private readonly redis: IORedis,
  ) {
    const concurrency = Number(process.env.ASSESS_WORKER_CONCURRENCY ?? '2');
    this.worker = new Worker(
      this.queue.name,
      async (job) => {
        const answerId: number = job.data.answerId;
        await this.processSingle(answerId);
      },
      { connection: this.redis, concurrency },
    );
  }

  async enqueue(answerId: number) {
    const opts: JobsOptions = {
      jobId: `answer-${answerId}`,
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    };
    await this.queue.add('assess', { answerId }, opts);
  }

  private async publish(
    jobId: number,
    answerId: number,
    status: AssessmentStatus,
    error?: string | null,
  ) {
    await this.pubsub.publish(answerId, {
      jobId,
      answerId,
      status,
      timestamp: new Date().toISOString(),
      error: error ?? null,
    });
  }

  private async processSingle(answerId: number) {
    const job = await this.repo.getAssessmentJobByAnswerId(answerId);
    if (!job) {
      this.logger.warn(`Job not found for answer ${answerId}`);
      return;
    }

    try {
      await this.repo.updateAssessmentJob(job.id, {
        status: AssessmentStatus.EVALUATING,
        startedAt: new Date(),
      });
      await this.publish(job.id, answerId, AssessmentStatus.EVALUATING);

      const { issues } = await this.orchestrator.evaluate(answerId);

      await this.repo.updateAssessmentJob(job.id, { status: AssessmentStatus.FEEDBACKING });
      await this.publish(job.id, answerId, AssessmentStatus.FEEDBACKING);

      await this.orchestrator.buildFeedback(answerId, issues);

      await this.repo.updateAssessmentJob(job.id, { status: AssessmentStatus.REWARDING });
      await this.publish(job.id, answerId, AssessmentStatus.REWARDING);

      await this.repo.updateAssessmentJob(job.id, {
        status: AssessmentStatus.DONE,
        finishedAt: new Date(),
      });
      await this.publish(job.id, answerId, AssessmentStatus.DONE);
    } catch (e: any) {
      const message = e?.message ?? 'unknown_error';
      await this.repo.updateAssessmentJob(job.id, {
        status: AssessmentStatus.FAILED,
        error: message,
        finishedAt: new Date(),
      });
      await this.publish(job.id, answerId, AssessmentStatus.FAILED, message);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await (this.queue as any)?.close?.();
  }
}
