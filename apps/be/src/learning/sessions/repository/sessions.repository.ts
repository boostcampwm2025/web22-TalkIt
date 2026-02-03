import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션을 조회한다.
   * 트랜잭션 클라이언트를 전달하면 동일 트랜잭션에서 조회한다.
   */
  async findById(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.session.findUnique({
      where: { id },
    });
  }

  /**
   * 사용자 ID로 진행 중인 세션을 조회한다.
   * 최근 시작된 세션이 우선 반환된다.
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
   * 새 세션을 생성하고 질문 카운트를 1로 시작한다.
   * 첫 질문이 제공된 상태를 가정한다.
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
   * 세션 정보를 업데이트한다.
   * 부분 업데이트 시 공용으로 사용한다.
   */
  async updateSession(id: number, data: Prisma.SessionUpdateInput) {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  /**
   * 세션 완료 정보와 정산 결과를 저장한다.
   * 점수/시간/획득 XP를 함께 기록한다.
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
   * 세션 내 질문 카운트를 1 증가시킨다.
   * 증가된 세션 레코드를 반환한다.
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
   * Prisma 트랜잭션을 실행하는 래퍼다.
   * 서비스 레이어에서 트랜잭션 경계를 명확히 한다.
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
