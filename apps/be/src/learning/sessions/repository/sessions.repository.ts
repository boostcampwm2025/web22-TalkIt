import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션 조회
   */
  async findById(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.session.findUnique({
      where: { id },
    });
  }

  /**
   * 사용자 ID로 진행 중인 세션 조회
   */
  async findActiveSessionByUserId(userId: number) {
    return this.prisma.session.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  /**
   * 새 세션 생성
   * - createSession 단계에서 첫 질문이 이미 제공되므로
   * - currentQuestionCount는 1부터 시작한다.
   */
  async createSession(
    data: { userId: number; category: string; difficulty: string },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.session.create({
      data: {
        userId: data.userId,
        status: 'ACTIVE',
        category: data.category,
        difficulty: data.difficulty,
        currentQuestionCount: 1,
      },
    });
  }

  /**
   * 세션 업데이트
   */
  async updateSession(id: number, data: Prisma.SessionUpdateInput) {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  /**
   * 세션 완료 처리
   * - getNextQuestion 등에서는 직접 호출하지 않고
   * - finishSession에서 단일 책임으로 호출
   */
  async completeSession(
    id: number,
    resultData: {
      totalScore: number;
      totalTimeSec: number;
      gainedXp: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalScore: resultData.totalScore,
        totalTimeSec: resultData.totalTimeSec,
        gainedXp: resultData.gainedXp,
      },
    });
  }

  /**
   * 세션 내 질문 count 증가 처리
   * - 트랜잭션 대응
   * - 증가된 session row를 반환
   */
  async incrementQuestionCount(sessionId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.session.update({
      where: { id: sessionId },
      data: {
        currentQuestionCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Prisma 트랜잭션 래퍼
   *
   * - Service 레이어에서 트랜잭션 경계를 명확히 하기 위함
   * - 현재는 세션 진행용으로 사용
   * - 내부 로직은 추후 확장 가능
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
