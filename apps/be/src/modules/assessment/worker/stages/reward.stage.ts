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
  const attempts = Number((job.opts as any)?.attempts ?? 1);
  logger.log(
    `[Reward] start: jobId=${job.id} answerId=${answerId} attemptsMade=${job.attemptsMade} attempts=${attempts}`,
  );
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
    logger.log(`[Reward] status REWARDING set: answerId=${answerId} jobRowId=${jobRow.id}`);

    await repo.withTransaction(async (tx) => {
      const answer = await tx.userAnswer.findUnique({
        where: { id: answerId },
        select: { userId: true },
      });
      if (!answer) throw new Error('ANSWER_NOT_FOUND');
      logger.log(`[Reward] userAnswer loaded: answerId=${answerId} userId=${answer.userId}`);
      await userCreditsRepository.consumeIfEnough(answer.userId, 'FEEDBACK_CONSUME', 1, tx);
      logger.log(`[Reward] credits consumed: answerId=${answerId} userId=${answer.userId}`);
      await tx.assessmentJob.update({
        where: { id: jobRow.id },
        data: { status: AssessmentStatus.DONE, finishedAt: new Date() },
      });
      logger.log(`[Reward] job DONE updated: answerId=${answerId} jobRowId=${jobRow.id}`);
    });

    await updateProgress(job, {
      jobId: jobRow.id,
      answerId,
      status: AssessmentStatus.DONE,
      timestamp: new Date().toISOString(),
      error: null,
    });
    logger.log(`[Reward] progress DONE emitted: answerId=${answerId} jobRowId=${jobRow.id}`);
    return { stage: 'reward', answerId } as const;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    logger.error(
      `[Reward] failed: jobId=${job.id} answerId=${answerId} attemptsMade=${job.attemptsMade} attempts=${(job.opts as any)?.attempts ?? 1} error=${message}`,
      stack,
    );
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
