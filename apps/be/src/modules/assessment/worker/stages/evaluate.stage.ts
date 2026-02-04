import type { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssessmentStatus } from '@prisma/client';

import type { AssessmentRepository } from '../../assessment.repository';
import type { EvaluationOrchestratorService } from '../../evaluation/application/evaluation-orchestrator.service';
import { TokenBucketService } from '../limiter/token-bucket.service';
import { getAssessmentStatus, jobIdStage, updateProgress } from '../utils/worker.utils';
import type { Job, Queue } from 'bullmq';

type AssessJobData = { answerId: number };

export type EvaluateStageDeps = {
  repo: AssessmentRepository;
  orchestrator: EvaluationOrchestratorService;
  config: ConfigService;
  fbQueue: Queue;
  logger: Logger;
  limiter: TokenBucketService;
};

export async function handleEvaluateStage(
  job: Job<AssessJobData>,
  { repo, orchestrator, config, fbQueue, logger, limiter }: EvaluateStageDeps,
) {
  const { answerId } = job.data;
  // parent jobId(root)는 체이닝 시 stage별 jobId로 대체 사용
  const jobRow = await repo.getAssessmentJobByAnswerId(answerId);
  if (!jobRow) {
    logger.warn(`[Evaluate] Job not found for answer ${answerId}`);
    await updateProgress(job, {
      jobId: -1,
      answerId,
      status: getAssessmentStatus('FAILED_EVALUATION', AssessmentStatus.FAILED),
      timestamp: new Date().toISOString(),
      error: 'job_not_found',
    });
    throw new Error('job_not_found');
  }
  try {
    await repo.updateAssessmentJob(jobRow.id, {
      status: AssessmentStatus.EVALUATING,
      startedAt: jobRow.startedAt ?? new Date(),
    });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.EVALUATING,
      timestamp: new Date().toISOString(),
      error: null,
    });

    // Rate limit: QPM 기반 토큰 버킷 적용 (HCX-007: QPM 180 → 절반 이하 권장)
    const qpm = Number(config.get<string>('ASSESS_LLM_QPM') ?? '90');
    const burst = Number(config.get<string>('ASSESS_LLM_QPM_BURST') ?? '30');
    const refill = qpm / 60; // 초당 리필량
    await limiter.waitUntilAllowed('rl:llm:global:qpm', {
      capacity: burst,
      refillPerSec: refill,
      amount: 1,
      maxWaitMs: Number(config.get<string>('ASSESS_LLM_RATE_MAX_WAIT_MS') ?? '3000'),
      baseDelayMs: Number(config.get<string>('ASSESS_LLM_RATE_DELAY_MS') ?? '250'),
      jitterMs: Number(config.get<string>('ASSESS_LLM_RATE_JITTER_MS') ?? '150'),
    });

    await orchestrator.createRubric(answerId);

    // 다음 단계 체이닝
    const nextId = jobIdStage(answerId, 'feedback');
    const attempts = Number(config.get<string>('ASSESS_FB_ATTEMPTS') ?? '2');
    const backoff = Number(config.get<string>('ASSESS_FB_BACKOFF_MS') ?? '2000');
    // 중복은 BullMQ가 jobId 기준으로 거부하므로 사전 조회 없이 add 호출
    await fbQueue.add(
      'feedback',
      { answerId },
      {
        jobId: nextId,
        removeOnComplete: true,
        attempts,
        backoff: { type: 'exponential', delay: backoff },
      },
    );
    return { stage: 'evaluate', answerId } as const;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await repo.updateAssessmentJob(jobRow.id, {
      status: getAssessmentStatus('FAILED_EVALUATION', AssessmentStatus.FAILED),
      error: message,
      finishedAt: new Date(),
    });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: getAssessmentStatus('FAILED_EVALUATION', AssessmentStatus.FAILED),
      timestamp: new Date().toISOString(),
      error: message,
    });
    throw e;
  }
}
