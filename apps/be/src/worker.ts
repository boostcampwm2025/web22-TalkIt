import { NestFactory } from '@nestjs/core';

import { QuestionFactoryModule } from './modules/question-factory/question-factory.module';
import { QuestionFactoryService } from './modules/question-factory/question-factory.service';
import { TermCurriculumRepository } from './modules/question-factory/term-curriculum.repository';
import { Job, Worker } from 'bullmq';
import 'dotenv/config';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QuestionFactoryModule, {
    logger: ['log', 'error', 'warn'],
  });
  const qfs = app.get(QuestionFactoryService);

  const connection = {
    connection: { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' },
  } as const;

  const worker = new Worker(
    'question-gen',
    async (job: Job) => {
      if (job.name !== 'question-gen.generate') return null;
      const data = job.data;
      if (!data.mode || data.mode === 'topic') {
        const { domain, topicId, version, nPerCell } = data as {
          domain: 'OS' | 'Network' | 'DB' | 'Data_Structure';
          topicId: string;
          version: string;
          nPerCell: number;
        };
        const seed = qfs.buildSeed(domain, topicId);
        const result = await qfs.generate({ version, nPerCell, seed });
        return result;
      }
      if (data.mode === 'term') {
        const { domain, version, conceptLevel } = data as {
          domain: 'OS' | 'Network' | 'DB' | 'Data_Structure';
          version: string;
          conceptLevel: 'Basic' | 'Intermediate' | 'Advanced';
        };
        const outputPaths: string[] = [];
        let accAccepted = 0;
        let accRejected = 0;
        let accDuplicate = 0;
        if (data.term) {
          const res = await qfs.generateByTerm({
            version,
            domain,
            term: data.term,
            conceptLevel,
            count: Math.max(1, Number(data.count) || 1),
          });
          accAccepted += res.acceptedCount;
          accRejected += res.rejectedCount;
          accDuplicate += res.duplicateCount;
          outputPaths.push(res.outputPath);
        } else {
          // batch: pick first N terms of that level for the domain
          const termRepo = app.get(TermCurriculumRepository);
          const terms = termRepo.listTerms(domain, conceptLevel);
          const n = Math.max(1, Number(data.count) || 1);
          const picked = terms.slice(0, n);
          for (const term of picked) {
            const res = await qfs.generateByTerm({
              version,
              domain,
              term,
              conceptLevel,
              count: Math.max(1, Number(data.itemsPerTerm) || 5),
            });
            accAccepted += res.acceptedCount;
            accRejected += res.rejectedCount;
            accDuplicate += res.duplicateCount;
            outputPaths.push(res.outputPath);
          }
        }
        return {
          acceptedCount: accAccepted,
          rejectedCount: accRejected,
          duplicateCount: accDuplicate,
          outputPath: outputPaths[0],
          outputPaths,
        };
      }
      return null;
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
