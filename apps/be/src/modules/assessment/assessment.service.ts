import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

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
      questionId?: number;
      extraQuestionId?: number;
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

    if ((!body.questionId && !body.extraQuestionId) || (body.questionId && body.extraQuestionId)) {
      throw new BadRequestException({
        code: 'INVALID_ANSWER_TARGET',
        message: 'questionId 또는 extraQuestionId 중 하나만 제공해야 합니다.',
      });
    }

    const answer = await this.repo.createUserAnswer({
      userId,
      sessionId,
      questionId: body.questionId,
      extraQuestionId: body.extraQuestionId,
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
    if (!job) {
      throw new NotFoundException({
        code: 'ASSESSMENT_JOB_NOT_FOUND',
        message: '평가 작업을 찾을 수 없습니다.',
      });
    }
    if (job.status !== AssessmentStatus.DONE) {
      if (
        job.status === AssessmentStatus.FAILED ||
        job.status === AssessmentStatus.FAILED_EVALUATION ||
        job.status === AssessmentStatus.FAILED_FEEDBACK
      ) {
        throw new UnprocessableEntityException({
          code: 'ASSESSMENT_FAILED',
          status: job.status,
          error: job.error ?? null,
        });
      }
      throw new ConflictException({
        code: 'ASSESSMENT_NOT_DONE',
        status: job.status,
      });
    }
    const feedback: any = (answer as any).feedbackJson ?? {};
    const accurate: string[] = Array.isArray(feedback?.accurate)
      ? feedback.accurate.map(String)
      : [];
    const improvement: string[] = Array.isArray(feedback?.improvement)
      ? feedback.improvement.map(String)
      : [];

    return {
      answerId: answer.id,
      question: String(
        (answer as any).question?.content ?? (answer as any).extraQuestion?.content ?? '',
      ),
      answer: String((answer as any).answerText ?? ''),
      overallScore: (answer as any).overallScore ?? null,
      strengths: accurate,
      weaknesses: [],
      suggestions: improvement,
      xp: (answer as any).session?.gainedXp ?? null,
      remainingToken: null,
    } as any;
  }
}
