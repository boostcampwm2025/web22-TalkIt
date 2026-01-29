import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserCreditsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 유저의 현재 총 크레딧 조회 (append-only ledger 구조)
   *
   * 동기화 불일치 문제 차단 위함.
   * - 모든 credit row의 amount 합계를 Source of Truth로 사용
   * - 캐싱/컬럼 저장 방식 대비 동기화 불일치 문제를 원천 차단
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
   * - 트랜잭션(TransactionClient) 대응
   * - 크레딧은 append-only ledger 구조 유지
   *
   * amount는 항상 음수(-)로 저장
   */
  async consume(userId: number, reason: string, amount: number = 1, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.userCredit.create({
      data: {
        userId,
        amount: -amount,
        reason,
      },
    });
  }

  /**
   * 조건부 차감
   *
   * 전제:
   * - worker 트랜잭션 안에서 호출
   *
   * 보장:
   * - 잔액 부족 시 차감 안되도록
   * - 차감 + DONE을 같은 트랜잭션으로 묶을 수 있음
   *
   * 비보장(의도적):
   * - 동일 userId에 대한 완전한 동시 차감 직렬화
   *   (이건 구조 변경이 필요)
   */
  async consumeIfEnough(
    userId: number,
    reason: string,
    amount: number = 1,
    tx: Prisma.TransactionClient,
  ) {
    // 현재 잔액 조회
    const result = await tx.$queryRaw<{ total: number }[]>`
    SELECT IFNULL(SUM(amount), 0) AS total
    FROM user_credits
    WHERE user_id = ${userId}
  `;

    const total = Number(result[0]?.total ?? 0);

    if (total < amount) {
      throw new Error('CREDIT_EXHAUSTED');
    }

    // 차감 기록 (INSERT)
    // - InnoDB write lock
    // - 트랜잭션 안이므로 DONE과 원자적으로 묶임
    return tx.userCredit.create({
      data: {
        userId,
        amount: -amount,
        reason,
      },
    });
  }
}
