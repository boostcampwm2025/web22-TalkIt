import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  // 워커 전용 프로세스: HTTP 서버 미기동
  const logger = new Logger('WorkerBootstrap');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
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
