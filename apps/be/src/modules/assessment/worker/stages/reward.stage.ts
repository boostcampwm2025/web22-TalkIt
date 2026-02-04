import type { Logger } from '@nestjs/common';

import type { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { AssessmentStatus } from '@prisma/client';

import type { AssessmentRepository } from '../../assessment.repository';
import { updateProgress } from '../utils/worker.utils';
import type { Job } from 'bullmq';

type AssessJobData = { answerId: number };

export type RewardStageDeps = {
  repo: AssessmentRepository;
  userCreditsRepository: UserCreditsRepository;
  logger: Logger;
};

export async function handleRewardStage(
  job: Job<AssessJobData>,
  { repo, userCreditsRepository, logger }: RewardStageDeps,
) {
  const { answerId } = job.data;
  const jobRow = await repo.getAssessmentJobByAnswerId(answerId);
  if (!jobRow) {
    logger.warn(`[Reward] Job not found for answer ${answerId}`);
    await updateProgress(job, {
      jobId: -1,
      answerId,
      status: AssessmentStatus.FAILED,
      timestamp: new Date().toISOString(),
      error: 'job_not_found',
    });
    throw new Error('job_not_found');
  }
  try {
    await repo.updateAssessmentJob(jobRow.id, { status: AssessmentStatus.REWARDING });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.REWARDING,
      timestamp: new Date().toISOString(),
      error: null,
    });

    await repo.withTransaction(async (tx) => {
      const answer = await tx.userAnswer.findUnique({
        where: { id: answerId },
        select: { userId: true },
      });
      if (!answer) throw new Error('ANSWER_NOT_FOUND');
      await userCreditsRepository.consumeIfEnough(answer.userId, 'FEEDBACK_CONSUME', 1, tx);
      await tx.assessmentJob.update({
        where: { id: jobRow.id },
        data: { status: AssessmentStatus.DONE, finishedAt: new Date() },
      });
    });

    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.DONE,
      timestamp: new Date().toISOString(),
      error: null,
    });
    return { stage: 'reward', answerId } as const;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await repo.updateAssessmentJob(jobRow.id, {
      status: AssessmentStatus.FAILED,
      error: message,
      finishedAt: new Date(),
    });
    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.FAILED,
      timestamp: new Date().toISOString(),
      error: message,
    });
    throw e;
  }
}
