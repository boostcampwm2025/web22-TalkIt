import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { AssessmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSessionById(sessionId: number) {
    return this.prisma.session.findUnique({ where: { id: sessionId } });
  }

  async createUserAnswer(data: {
    userId: number;
    sessionId: number;
    answerText: string;
    timeSpentSec: number;
    questionId?: number;
    extraQuestionId?: number;
  }) {
    if ((!data.questionId && !data.extraQuestionId) || (data.questionId && data.extraQuestionId)) {
      throw new Error('Either questionId or extraQuestionId must be provided (but not both)');
    }

    return this.prisma.userAnswer.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        questionId: data.questionId,
        extraQuestionId: data.extraQuestionId,
        answerText: data.answerText,
        timeSpentSec: data.timeSpentSec,
        // overallScore, feedbackJson left null initially
      },
    });
  }

  async createAssessmentJob(answerId: number) {
    return this.prisma.assessmentJob.create({
      data: {
        answerId,
        status: AssessmentStatus.QUEUED,
      },
    });
  }

  async getAssessmentJobByAnswerId(answerId: number) {
    return this.prisma.assessmentJob.findUnique({
      where: { answerId },
    });
  }

  async updateAssessmentJob(jobId: number, data: Prisma.AssessmentJobUpdateInput) {
    return this.prisma.assessmentJob.update({ where: { id: jobId }, data });
  }

  async getAnswerWithRelations(answerId: number) {
    return this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      include: { session: true, question: true },
    });
  }

  async setAnswerScore(answerId: number, score: number) {
    return this.prisma.userAnswer.update({
      where: { id: answerId },
      data: { overallScore: score },
    });
  }

  async setAnswerFeedback(answerId: number, feedback: Prisma.InputJsonValue) {
    return this.prisma.userAnswer.update({
      where: { id: answerId },
      data: { feedbackJson: feedback },
    });
  }
}
