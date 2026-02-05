import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '@/infra/database/database.module';
import { AssessmentRepository } from '@/modules/assessment/assessment.repository';
import { EvaluationModule } from '@/modules/assessment/evaluation/evaluation.module';
import { AssessmentRedisModule } from '@/modules/assessment/redis/assessment-redis.module';
import { AssessmentWorker } from '@/modules/assessment/worker/assessment.worker';
import { TokenBucketService } from '@/modules/assessment/worker/limiter/token-bucket.service';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

// Worker-only module: no HTTP/auth; only Redis queues and BullMQ workers
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AssessmentRedisModule,
    EvaluationModule,
  ],
  providers: [AssessmentRepository, AssessmentWorker, TokenBucketService, UserCreditsRepository],
})
export class WorkerModule {}
