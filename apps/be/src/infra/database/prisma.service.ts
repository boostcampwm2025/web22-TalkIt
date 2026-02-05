import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // PrismaClient 로깅/에러 포맷을 환경변수로 제어할 수 있도록 구성
    const logEnv = (process.env.PRISMA_LOG_LEVELS ?? 'error,warn')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as any;
    const errorFormat = (process.env.PRISMA_ERROR_FORMAT as any) ?? 'pretty';

    // 50명 동시 처리 기준 DB 풀 설정(1GB 메모리 서버 가정)
    // - 기본 connection_limit=40, pool_timeout=30초
    // - 환경변수로 오버라이드 가능: DB_POOL_CONNECTION_LIMIT, DB_POOL_TIMEOUT_MS
    const rawUrl = process.env.DATABASE_URL ?? '';
    const connLimit = Math.max(1, Number(process.env.DB_POOL_CONNECTION_LIMIT ?? '40'));
    const poolTimeoutMs = Math.max(1000, Number(process.env.DB_POOL_TIMEOUT_MS ?? '30000'));
    const finalUrl = tryAppendQueryParams(rawUrl, {
      connection_limit: String(connLimit),
      pool_timeout: String(Math.floor(poolTimeoutMs / 1000)),
    });

    super({ log: logEnv, errorFormat, datasources: { db: { url: finalUrl || undefined } } });
  }

  // 테스트에서 대기 시간을 주입 가능하도록 별도 메서드로 분리
  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async onModuleInit() {
    // 컨테이너/네트워크 환경에서 초기 연결 실패에 대비하여 지수 백오프를 적용
    const maxRetries = Math.min(
      60,
      Math.max(1, Number(process.env.PRISMA_CONNECT_RETRIES ?? '10')),
    );
    const baseDelay = Math.min(
      10_000,
      Math.max(100, Number(process.env.PRISMA_CONNECT_RETRY_DELAY_MS ?? '1000')),
    );
    const maxDelay = Math.min(60_000, Number(process.env.PRISMA_CONNECT_MAX_DELAY_MS ?? '10000'));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected successfully');
        return;
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (attempt >= maxRetries) {
          this.logger.error(`Prisma connect failed (final): ${msg}`);
          // 최종 실패 시 원인 메시지를 래핑하여 상위에서 원인 파악 용이
          const anyError: any = Error;
          throw new anyError(`PRISMA_CONNECT_FAILED: ${msg}`, { cause: e });
        }
        const delay = Math.min(maxDelay, Math.floor(baseDelay * 2 ** (attempt - 1)));
        this.logger.warn(
          `Prisma connect failed (attempt ${attempt}/${maxRetries}): ${msg}. Retrying in ${delay}ms...`,
        );
        await this.sleep(delay);
      }
    }
  }

  async onModuleDestroy() {
    // 종료 시 연결을 정리. 실패하더라도 애플리케이션 종료는 계속되도록 함
    try {
      await this.$disconnect();
    } catch (e: any) {
      this.logger.warn(`Prisma disconnect failed: ${e?.message ?? e}`);
    }
  }
}

// 주어진 커넥션 문자열에 쿼리 파라미터를 추가/보완합니다.
function tryAppendQueryParams(urlStr: string, params: Record<string, string>): string {
  try {
    if (!urlStr) return urlStr;
    const url = new URL(urlStr);
    for (const [k, v] of Object.entries(params)) {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    // URL 파싱 실패 시 원본 유지(잘못된 DSN 형식 등)
    return urlStr;
  }
}
