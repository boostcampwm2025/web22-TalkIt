import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션 조회
   */
  async findById(id: bigint) {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  /**
   * 사용자 ID로 진행 중인 세션 조회
   */
  async findActiveSessionByUserId(userId: bigint) {
    return this.prisma.session.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  /**
   * 새 세션 생성
   */
  async createSession(data: { userId: bigint; expiresAt: Date }) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        status: 'IN_PROGRESS',
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * 세션 업데이트
   */
  async updateSession(id: bigint, data: Prisma.SessionUpdateInput) {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  /**
   * 세션 완료 처리
   */
  async completeSession(id: bigint) {
    return this.prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * 사용자 답변 저장
   */
  async saveAnswer(data: {
    sessionId: bigint;
    userId: bigint;
    questionId: bigint;
    answerText: string;
    timeSpentSec: number;
    overallScore?: number;
    feedbackJson?: Prisma.InputJsonValue;
    earnedCredit?: boolean;
  }) {
    return this.prisma.userAnswer.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId,
        questionId: data.questionId,
        answerText: data.answerText,
        timeSpentSec: data.timeSpentSec,
        overallScore: data.overallScore ?? 0,
        feedbackJson: data.feedbackJson ?? {},
        earnedCredit: data.earnedCredit ?? false,
      },
    });
  }

  /**
   * 세션의 모든 답변 조회
   */
  async findAnswersBySessionId(sessionId: bigint) {
    return this.prisma.userAnswer.findMany({
      where: { sessionId },
      include: {
        question: {
          select: {
            id: true,
            content: true,
            category: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * 답변 ID로 답변 조회
   */
  async findAnswerById(id: bigint) {
    return this.prisma.userAnswer.findUnique({
      where: { id },
      include: {
        question: true,
        session: true,
      },
    });
  }

  /**
   * 답변 업데이트
   */
  async updateAnswer(id: bigint, data: Prisma.UserAnswerUpdateInput) {
    return this.prisma.userAnswer.update({
      where: { id },
      data,
    });
  }
}
