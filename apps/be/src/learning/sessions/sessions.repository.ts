import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/database/prisma.service';

/**
 * SessionsRepository (세션 생명주기 전용)
 * 책임
 * - 세션 생성
 * - 세션 조회
 * - 세션 상태 변경 (ACTIVE / COMPLETED)
 * - 세션 메타데이터 관리
 */

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션 조회
   */
  async findById(id: number) {
    return this.prisma.session.findUnique({
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
