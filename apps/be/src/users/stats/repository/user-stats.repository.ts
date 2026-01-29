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
   * 유저의 학습 통계 정보를 절대값을 덮어쓰지 않고, '증가량(delta)'을 받아서 처리하도록 변경
   * @param userId 유저 ID
   * @param data 업데이트할 데이터 (레벨, 경험치, 총 문제 수)
   * @param tx (Optional) 외부 트랜잭션 클라이언트
   */
  async updateStatsAtomic(
    userId: number,
    data: {
      addedXp: number;
      addedSolvedCount: number;
      addedStudyTime: number;
      newLevel: number;
      streakDays: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.userStats.upsert({
      where: { userId },
      update: {
        level: data.newLevel,
        currentXp: { increment: data.addedXp },
        totalSolvedQuestions: { increment: data.addedSolvedCount },
        totalStudyTimeSec: { increment: data.addedStudyTime },
        streakDays: data.streakDays,
        updatedAt: new Date(),
      },
      create: {
        userId,
        currentXp: data.addedXp,
        totalSolvedQuestions: data.addedSolvedCount,
        totalStudyTimeSec: data.addedStudyTime,
        level: data.newLevel,
        streakDays: data.streakDays,
      },
    });
  }
}
