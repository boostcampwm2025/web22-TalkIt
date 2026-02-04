import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';
import { DatabaseModule } from '@/infra/database/database.module';
import { SessionsModule } from '@/learning/sessions/sessions.module';
import { UsersModule } from '@/users/users.module';

import { AssessmentController } from './assessment.controller';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { EvaluationModule } from './evaluation/evaluation.module';
import { AssessmentRedisModule } from './redis/assessment-redis.module';
import { AssessmentQueueEventBus } from './redis/assessment.queue-events';
import { AssessmentSseController } from './sse/assessment.sse.controller';
import { AssessmentWorker } from './worker/assessment.worker';
import { TokenBucketService } from './worker/limiter/token-bucket.service';

@Module({
  imports: [
    DatabaseModule,
    ClovaModule,
    EvaluationModule,
    UsersModule,
    SessionsModule,
    AssessmentRedisModule,
  ],
  controllers: [AssessmentController, AssessmentSseController],
  providers: [
    AssessmentService,
    AssessmentRepository,

    // Worker + Event Bus
    AssessmentWorker,
    AssessmentQueueEventBus,
    TokenBucketService,
  ],
})
export class AssessmentModule {}
