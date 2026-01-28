import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';
import { DatabaseModule } from '@/infra/database/database.module';

import { AssessmentController } from './assessment.controller';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { EvaluationModule } from './evaluation/evaluation.module';
import { AssessmentSseController } from './sse/assessment.sse.controller';
import { AssessmentQueueEventBus } from './worker/assessment.queue-events';
import { AssessmentRedisShutdown } from './worker/assessment.redis-shutdown';
import {
  ASSESS_QUEUE,
  ASSESS_REDIS,
  ASSESS_REDIS_EVENTS,
  AssessmentWorker,
} from './worker/assessment.worker';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Module({
  imports: [DatabaseModule, ClovaModule, EvaluationModule],
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
      // QueueEvents는 Streams read 성격이라 connection 분리를 권장
      provide: ASSESS_REDIS_EVENTS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },

    // BullMQ Queue
    {
      provide: ASSESS_QUEUE,
      inject: [ASSESS_REDIS],
      useFactory: (redis: IORedis) => new Queue('assessment', { connection: redis }),
    },

    // Worker + Event Bus
    AssessmentWorker,
    AssessmentQueueEventBus,

    // graceful shutdown for redis clients
    AssessmentRedisShutdown,
  ],
})
export class AssessmentModule {}
