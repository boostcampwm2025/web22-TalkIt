import { NestFactory } from '@nestjs/core';

import { QuestionFactoryModule } from './modules/question-factory/question-factory.module';
import { QuestionFactoryService } from './modules/question-factory/question-factory.service';
import { Job, Worker } from 'bullmq';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QuestionFactoryModule, {
    logger: ['log', 'error', 'warn'],
  });
  const qfs = app.get(QuestionFactoryService);

  /* eslint-disable turbo/no-undeclared-env-vars */
  const connection = {
    connection: { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' },
  } as const;
  /* eslint-enable turbo/no-undeclared-env-vars */

  const worker = new Worker(
    'question-gen',
    async (job: Job) => {
      if (job.name !== 'question-gen.generate') return null;
      const { domain, topicId, version, nPerCell } = job.data as {
        domain: 'OS' | 'Network' | 'DB' | 'Data_Structure';
        topicId: string;
        version: string;
        nPerCell: number;
      };
      const seed = qfs.buildSeed(domain, topicId);
      const result = await qfs.generate({ version, nPerCell, seed });
      return result;
    },
    connection,
  );

  worker.on('ready', () => {
    console.log('[worker] Ready. Listening to question-gen');
  });
  worker.on('failed', (job, err) => {
    console.error('[worker] Job failed', job?.id, err);
  });
  worker.on('completed', (job) => {
    console.log('[worker] Job completed', job.id);
  });
}

bootstrap().catch((e) => {
  console.error('Worker bootstrap failed:', e);
  process.exit(1);
});
