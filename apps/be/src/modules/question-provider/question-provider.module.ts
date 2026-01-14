import { Module } from '@nestjs/common';

import { QuestionProviderService } from './application/question-provider.service';
import { QUESTION_PICK_STRATEGY } from './domain/strategy/question-pick-strategy';
import { RandomPickStrategy } from './domain/strategy/random-pick-strategy';
import { QUESTION_POOL_CACHE } from './infra/ports/question-pool.cache';
import { QUESTION_REPOSITORY } from './infra/ports/question.repository';
import { PrismaService } from './infra/prisma/prisma.service';
import { QuestionRepositoryPrisma } from './infra/prisma/question.repository.prisma';
import { QuestionPoolCacheRedis } from './infra/redis/question-pool.cache.redis';
import { RedisProviderModule } from './infra/redis/redis.provider';
import { QuestionProviderController } from './presentation/question-provider.controller';

// Question Provider 모듈: 컨트롤러/서비스/인프라 바인딩
@Module({
  imports: [RedisProviderModule],
  controllers: [QuestionProviderController],
  providers: [
    PrismaService,
    QuestionProviderService,
    { provide: QUESTION_PICK_STRATEGY, useClass: RandomPickStrategy },
    { provide: QUESTION_REPOSITORY, useClass: QuestionRepositoryPrisma },
    { provide: QUESTION_POOL_CACHE, useClass: QuestionPoolCacheRedis },
  ],
  exports: [QuestionProviderService],
})
export class QuestionProviderModule {}
