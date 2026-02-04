import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/infra/database/database.module';
import { SessionsModule } from '@/learning/sessions/sessions.module';
import { UsersModule } from '@/users/users.module';

import { AssessmentController } from './assessment.controller';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { AssessmentRedisModule } from './redis/assessment-redis.module';
import { AssessmentQueueEventBus } from './redis/assessment.queue-events';
import { AssessmentSseController } from './sse/assessment.sse.controller';

// API 전용 모듈: 컨트롤러/서비스/QueueEvents만 포함 (LLM/Worker 제외)
@Module({
  imports: [DatabaseModule, UsersModule, SessionsModule, AssessmentRedisModule],
  controllers: [AssessmentController, AssessmentSseController],
  providers: [AssessmentService, AssessmentRepository, AssessmentQueueEventBus],
})
export class AssessmentApiModule {}
