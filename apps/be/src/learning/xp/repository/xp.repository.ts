import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

@Injectable()
export class XpRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 특정 레벨의 필요 경험치를 조회하는 메서드
  async findRequiredXpByLevel(level: number): Promise<number> {
    const xpData = await this.prisma.xp.findUnique({
      where: { level },
    });

    // DB에 데이터가 없으면 fallback 로직 (시딩이 안됐을 경우 대비)
    return xpData ? xpData.requiredXp : level * 1000;
  }
}
