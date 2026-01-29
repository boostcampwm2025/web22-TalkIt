import { Module } from '@nestjs/common';

import { CreateExtraQuestionUseCase } from './application/create-extra-question.usecase';
import { GenerateFollowupQuestionUseCase } from './application/generate-followup-question.usecase';
import { QuestionContextResolver } from './application/question-context-resolver';
import { QuestionProviderService } from './application/question-provider.service';
import { QUESTION_PICK_STRATEGY } from './domain/strategy/question-pick-strategy';
import { RandomPickStrategy } from './domain/strategy/random-pick-strategy';
import { FollowupQuestionGenerator } from './infra/llm/followup-question-genrator';
import { EXTRA_QUESTION_REPOSITORY } from './infra/ports/extra-question.repository.port';
import { FOLLOWUP_QUESTION_GENERATOR } from './infra/ports/followup-question-generator.port';
import { QUESTION_POOL_CACHE } from './infra/ports/question-pool.cache';
import { QUESTION_REPOSITORY } from './infra/ports/question.repository';
import { USER_ANSWER_REPOSITORY } from './infra/ports/user-answer.repository.port';
import { ExtraQuestionRepositoryPrisma } from './infra/prisma/extra-question.repository.prisma';
import { PrismaService } from './infra/prisma/prisma.service';
import { QuestionRepositoryPrisma } from './infra/prisma/question.repository.prisma';
import { UserAnswerRepositoryPrisma } from './infra/prisma/user-answer.repository.prisma';
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
    GenerateFollowupQuestionUseCase,
    CreateExtraQuestionUseCase,
    QuestionContextResolver,
    { provide: QUESTION_PICK_STRATEGY, useClass: RandomPickStrategy },
    { provide: QUESTION_REPOSITORY, useClass: QuestionRepositoryPrisma },
    { provide: EXTRA_QUESTION_REPOSITORY, useClass: ExtraQuestionRepositoryPrisma },
    { provide: QUESTION_POOL_CACHE, useClass: QuestionPoolCacheRedis },
    { provide: FOLLOWUP_QUESTION_GENERATOR, useClass: FollowupQuestionGenerator },
    { provide: USER_ANSWER_REPOSITORY, useClass: UserAnswerRepositoryPrisma },
  ],
  exports: [
    QuestionProviderService,
    GenerateFollowupQuestionUseCase,
    CreateExtraQuestionUseCase,
    QuestionContextResolver,
    QUESTION_REPOSITORY,
    EXTRA_QUESTION_REPOSITORY,
    USER_ANSWER_REPOSITORY,
  ],
})
export class QuestionProviderModule {}
