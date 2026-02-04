import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';

async function bootstrap() {
  // 워커 전용 프로세스: HTTP 서버 미기동
  const logger = new Logger('WorkerBootstrap');

  // 안전장치: 워커 플래그 기본값 1 (외부에서 0으로 꺼도 됨)
  process.env.ASSESS_ENABLE_WORKERS = process.env.ASSESS_ENABLE_WORKERS ?? '1';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  logger.log('Worker application context started.');

  const shutdown = async (signal: string) => {
    try {
      logger.warn(`Received ${signal}. Closing worker application context...`);
      await app.close();
      logger.log('Worker application context closed.');
      process.exit(0);
    } catch (e) {
      logger.error(`Worker shutdown failed: ${(e as any)?.message ?? e}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
