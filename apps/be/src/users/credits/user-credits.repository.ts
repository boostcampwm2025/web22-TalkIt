import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

@Injectable()
export class UserCreditsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 유저의 현재 총 크레딧 조회 (append-only ledger 구조)
   *
   * 동기화 불일치 문제 차단 위함.
   */
  async getTotalCredit(userId: number): Promise<number> {
    const result = await this.prisma.userCredit.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  /**
   * 유저 크레딧 지급 (양수 저장)
   * 회원가입 보상, 미션 완료 보상 등
   */
  async grant(userId: number, reason: string, amount: number) {
    return this.prisma.userCredit.create({
      data: {
        userId,
        amount: amount, // 양수(+) 그대로 저장
        reason,
      },
    });
  }

  /**
   * 유저 크레딧 차감
   * 크레딧 차감은 기존 row를 수정하지 않고
   * 새로운 row를 추가하는 방식으로 처리
   *
   * amount는 항상 음수(-)로 저장
   */
  async consume(userId: number, reason: string, amount: number = 1) {
    return this.prisma.userCredit.create({
      data: {
        userId,
        amount: -amount,
        reason,
      },
    });
  }
}
