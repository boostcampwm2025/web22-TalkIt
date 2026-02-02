import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluateService } from './application/evaluate.service';
import { EvaluationOrchestratorService } from './application/evaluation-orchestrator.service';
import { FeedbackService } from './application/feedback.service';
import { RubricService } from './application/rubric.service';
import { ScoringService } from './domain/scoring.service';
import { EvaluationRepository } from './evaluation.repository';
import { LlmEvaluationProvider } from './infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from './infra/llm-feedback.provider';
import { GOLDEN_CACHE_REDIS, LlmGoldenProvider } from './infra/llm-golden.provider';
import { LlmRubricProvider } from './infra/llm-rubric.provider';
import IORedis from 'ioredis';

@Module({
  imports: [ClovaModule],
  providers: [
    AssessmentRepository,
    EvaluationRepository,
    EvaluationOrchestratorService,
    EvaluateService,
    RubricService,
    FeedbackService,
    ScoringService,
    LlmEvaluationProvider,
    LlmRubricProvider,
    LlmFeedbackProvider,
    LlmGoldenProvider,
    {
      provide: GOLDEN_CACHE_REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [EvaluationOrchestratorService],
})
export class EvaluationModule {}
