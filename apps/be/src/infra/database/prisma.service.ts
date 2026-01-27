import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    // MySQL 컨테이너가 기동 중일 수 있으므로 재시도 로직을 추가합니다.
    const retries = Number(process.env.PRISMA_CONNECT_RETRIES ?? '10');
    const delayMs = Number(process.env.PRISMA_CONNECT_RETRY_DELAY_MS ?? '1000');
    for (let attempt = 1; attempt <= Math.max(1, retries); attempt++) {
      try {
        await this.$connect();
        return;
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (attempt >= retries) {
          this.logger.error(`Prisma connect failed (final): ${msg}`);
          throw e;
        }
        this.logger.warn(
          `Prisma connect failed (attempt ${attempt}/${retries}): ${msg}. Retrying in ${delayMs}ms...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
