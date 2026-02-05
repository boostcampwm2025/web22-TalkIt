import type { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssessmentStatus } from '@prisma/client';

import type { AssessmentRepository } from '../../assessment.repository';
import type { EvaluationOrchestratorService } from '../../evaluation/application/evaluation-orchestrator.service';
import { TokenBucketService } from '../limiter/token-bucket.service';
import { getAssessmentStatus, jobIdStage, updateProgress } from '../utils/worker.utils';
import type { Job, Queue } from 'bullmq';

type AssessJobData = { answerId: number };

export type FeedbackStageDeps = {
  repo: AssessmentRepository;
  orchestrator: EvaluationOrchestratorService;
  config: ConfigService;
  rewardQueue: Queue;
  logger: Logger;
  limiter: TokenBucketService;
};

export async function handleFeedbackStage(
  job: Job<AssessJobData>,
  { repo, orchestrator, config, rewardQueue, logger, limiter }: FeedbackStageDeps,
) {
  const { answerId } = job.data;
  const attempts = Number((job.opts as any)?.attempts ?? 1);
  logger.log(
    `[Feedback] start: jobId=${job.id} answerId=${answerId} attemptsMade=${job.attemptsMade} attempts=${attempts}`,
  );
  // parent jobId(root)는 체이닝 시 stage별 jobId로 대체 사용
  const jobRow = await repo.getAssessmentJobByAnswerId(answerId);
  if (!jobRow) {
    logger.warn(`[Feedback] Job not found for answer ${answerId}`);
    await updateProgress(job, {
      jobId: -1,
      answerId,
      status: getAssessmentStatus('FAILED_FEEDBACK', AssessmentStatus.FAILED),
      timestamp: new Date().toISOString(),
      error: 'job_not_found',
    });
    throw new Error('job_not_found');
  }
  try {
    await repo.updateAssessmentJob(jobRow.id, { status: AssessmentStatus.FEEDBACKING });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.FEEDBACKING,
      timestamp: new Date().toISOString(),
      error: null,
    });

    // Rate limit: QPM 기준 동일 정책 적용 (피드백 생성 시 LLM 호출 발생 가능)
    const qpm = Number(config.get<string>('ASSESS_LLM_QPM') ?? '45');
    const burst = Number(config.get<string>('ASSESS_LLM_QPM_BURST') ?? '20');
    const refill = qpm / 60; // 초당 리필량
    const rateWaitStartedAt = Date.now();
    logger.log(
      `[Feedback] rate-limit wait start: answerId=${answerId} qpm=${qpm} burst=${burst} refillPerSec=${refill.toFixed(2)}`,
    );
    await limiter.waitUntilAllowed('rl:llm:global:qpm', {
      capacity: burst,
      refillPerSec: refill,
      amount: 1,
      maxWaitMs: Number(config.get<string>('ASSESS_LLM_RATE_MAX_WAIT_MS') ?? '5000'),
      baseDelayMs: Number(config.get<string>('ASSESS_LLM_RATE_DELAY_MS') ?? '250'),
      jitterMs: Number(config.get<string>('ASSESS_LLM_RATE_JITTER_MS') ?? '150'),
    });
    logger.log(
      `[Feedback] rate-limit wait done: answerId=${answerId} elapsedMs=${Date.now() - rateWaitStartedAt}`,
    );

    // 평가+피드백 통합: 평가 수행 시 내부적으로 피드백(평가 JSON)까지 저장됨
    logger.log(`[Feedback] orchestrator.evaluate start: answerId=${answerId}`);
    await orchestrator.evaluate(answerId);
    logger.log(`[Feedback] orchestrator.evaluate done: answerId=${answerId}`);

    const nextId = jobIdStage(answerId, 'reward');
    const attempts = Number(config.get<string>('ASSESS_REWARD_ATTEMPTS') ?? '2');
    const backoff = Number(config.get<string>('ASSESS_REWARD_BACKOFF_MS') ?? '1000');
    // 중복은 BullMQ가 jobId 기준으로 거부하므로 사전 조회 없이 add 호출
    await rewardQueue.add(
      'reward',
      { answerId },
      {
        jobId: nextId,
        removeOnComplete: true,
        attempts,
        backoff: { type: 'exponential', delay: backoff },
      },
    );
    logger.log(
      `[Feedback] enqueue reward: answerId=${answerId} jobId=${nextId} attempts=${attempts} backoff=${backoff}ms`,
    );
    return { stage: 'feedback', answerId } as const;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    logger.error(
      `[Feedback] failed: jobId=${job.id} answerId=${answerId} attemptsMade=${job.attemptsMade} attempts=${(job.opts as any)?.attempts ?? 1} error=${message}`,
      stack,
    );
    await repo.updateAssessmentJob(jobRow.id, {
      status: getAssessmentStatus('FAILED_FEEDBACK', AssessmentStatus.FAILED),
      error: message,
      finishedAt: new Date(),
    });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: getAssessmentStatus('FAILED_FEEDBACK', AssessmentStatus.FAILED),
      timestamp: new Date().toISOString(),
      error: message,
    });
    try {
      await repo.deleteAnswerById(answerId);
      logger.warn(`[Feedback] cleanup answer: answerId=${answerId}`);
    } catch (cleanupError: unknown) {
      const cleanupMessage =
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      logger.error(`[Feedback] cleanup failed: answerId=${answerId} error=${cleanupMessage}`);
    }
    throw e;
  }
}
