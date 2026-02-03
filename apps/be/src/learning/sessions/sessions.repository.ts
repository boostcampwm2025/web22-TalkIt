import { Injectable } from '@nestjs/common';

import { Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션을 조회한다.
   * 단건 조회용이며, 진행 상태는 여기서 판단하지 않는다.
   */
  async findById(id: number) {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  /**
   * 사용자 ID로 진행 중인 세션을 조회한다.
   * 최신 세션이 우선 반환되도록 시작 시간을 기준으로 정렬한다.
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
   * 새 학습 세션을 생성한다.
   * 기본 상태는 ACTIVE로 저장한다.
   */
  async createSession(data: { userId: number; category: string; difficulty: string }) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        status: 'ACTIVE',
        category: data.category,
        difficulty: data.difficulty,
      },
    });
  }

  /**
   * 세션 정보를 업데이트한다.
   * 상태/메타데이터 변경 시 공용으로 사용한다.
   */
  async updateSession(id: number, data: Prisma.SessionUpdateInput) {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  /**
   * 세션을 완료 상태로 변경한다.
   * 완료 시각을 함께 기록한다.
   */
  async completeSession(id: number) {
    return this.prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
