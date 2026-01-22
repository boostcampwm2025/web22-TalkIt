import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 특정 유저의 학습 통계를 조회하는 메서드
   * @param userId 유저 ID
   * @param tx (Optional) 외부 트랜잭션 클라이언트
   */
  async findStatsByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.userStats.findUnique({
      where: { userId },
    });
  }

  /**
   * 유저의 학습 통계 정보를 갱신하거나 새로 생성하는 메서드 (Upsert)
   * @param userId 유저 ID
   * @param data 업데이트할 데이터 (레벨, 경험치, 총 문제 수)
   * @param tx (Optional) 외부 트랜잭션 클라이언트
   */
  async upsertStats(
    userId: number,
    data: {
      level: number;
      currentXp: number;
      totalSolvedQuestions: number;
      streakDays?: number;
      totalStudyTimeSec?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.userStats.upsert({
      where: { userId },
      update: {
        level: data.level,
        currentXp: data.currentXp,
        totalSolvedQuestions: data.totalSolvedQuestions,
        ...(data.streakDays !== undefined && { streakDays: data.streakDays }),
        ...(data.totalStudyTimeSec !== undefined && { totalStudyTimeSec: data.totalStudyTimeSec }),
        updatedAt: new Date(),
      },
      create: {
        userId,
        level: data.level,
        currentXp: data.currentXp,
        totalSolvedQuestions: data.totalSolvedQuestions,
        streakDays: data.streakDays ?? 1,
        totalStudyTimeSec: data.totalStudyTimeSec ?? 0,
      },
    });
  }
}
