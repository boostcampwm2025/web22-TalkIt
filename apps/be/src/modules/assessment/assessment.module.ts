import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/infra/database/database.module';

import { AssessmentController } from './assessment.controller';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { ASSESS_PUB, ASSESS_SUB, AssessmentPubSub } from './pubsub/assessment.pubsub';
import { AssessmentSseController } from './sse/assessment.sse.controller';
import { ASSESS_QUEUE, ASSESS_REDIS, AssessmentWorker } from './worker/assessment.worker';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Module({
  imports: [DatabaseModule],
  controllers: [AssessmentController, AssessmentSseController],
  providers: [
    AssessmentService,
    AssessmentRepository,
    // Redis connections
    {
      provide: ASSESS_REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: ASSESS_PUB,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: ASSESS_SUB,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        const client = new IORedis(url, { maxRetriesPerRequest: null });
        client.setMaxListeners(1000);
        return client;
      },
    },
    // BullMQ Queue
    {
      provide: ASSESS_QUEUE,
      inject: [ASSESS_REDIS],
      useFactory: (redis: IORedis) => new Queue('assessment', { connection: redis }),
    },
    AssessmentWorker,
    AssessmentPubSub,
  ],
})
export class AssessmentModule {}
