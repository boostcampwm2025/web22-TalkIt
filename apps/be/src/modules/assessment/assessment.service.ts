import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from './assessment.repository';
import { AssessmentWorker } from './worker/assessment.worker';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly worker: AssessmentWorker,
  ) {}

  async submitAndAssess(
    userId: number,
    sessionId: number,
    body: {
      questionId: number;
      answerText: string;
      timeSpentSec: number;
    },
  ) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }
    if (session.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    const answer = await this.repo.createUserAnswer({
      userId,
      sessionId,
      questionId: body.questionId,
      answerText: body.answerText,
      timeSpentSec: body.timeSpentSec,
    });

    const job = await this.repo.createAssessmentJob(answer.id);

    await this.worker.enqueue(answer.id);

    return {
      jobId: job.id,
      answerId: answer.id,
      status: AssessmentStatus.QUEUED,
    };
  }

  async getSnapshot(userId: number, answerId: number) {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer)
      throw new NotFoundException({
        code: 'ANSWER_NOT_FOUND',
        message: '답변을 찾을 수 없습니다.',
      });
    if (answer.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '답변 소유자가 아닙니다.' });
    }
    const job = await this.repo.getAssessmentJobByAnswerId(answerId);
    return {
      jobId: job?.id ?? null,
      answerId: answer.id,
      status: job?.status ?? null,
      result: {
        score: answer.overallScore ?? null,
        feedback: answer.feedbackJson ?? null,
      },
    };
  }
}
