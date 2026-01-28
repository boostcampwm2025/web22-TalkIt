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
    // NOTE(레포지토리 책임 범위):
    //  - questionId/extraQuestionId의 XOR(서로 배타) 검증은 서비스 계층에서 수행합니다.
    //  - 레포지토리는 가능한 데이터 영속화에만 집중하여 도메인 검증 중복과 500 에러 리스크를 줄입니다.
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

  /**
   * 답변 생성과 평가 작업 생성(초기 QUEUED)을 하나의 트랜잭션으로 처리합니다.
   * 큐 등록은 트랜잭션 범위 밖에서 수행되어야 하므로 서비스 계층에서 후속 처리합니다.
   */
  async createAnswerAndJob(data: {
    userId: number;
    sessionId: number;
    answerText: string;
    timeSpentSec: number;
    questionId?: number;
    extraQuestionId?: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.userAnswer.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          questionId: data.questionId,
          extraQuestionId: data.extraQuestionId,
          answerText: data.answerText,
          timeSpentSec: data.timeSpentSec,
        },
      });

      const job = await tx.assessmentJob.create({
        data: {
          answerId: answer.id,
          status: AssessmentStatus.QUEUED,
        },
      });

      return { answer, job } as const;
    });
  }

  /**
   * 한국어 주석: `answerId`로 단일 평가 잡을 조회합니다.
   *
   * Prisma 스키마에서 `AssessmentJob.answerId`는 `@unique`로 보장됩니다.
   * 따라서 `findUnique` 사용이 타당하며, 최대 1건만 반환됩니다.
   */
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
      include: { session: true, question: true, extraQuestion: true },
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
