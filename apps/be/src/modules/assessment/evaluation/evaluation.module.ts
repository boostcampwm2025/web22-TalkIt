import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';
import { StructuredNormalizerModule } from '@/infra/structured/structured-normalizer.module';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluateService } from './application/evaluate.service';
import { EvaluationOrchestratorService } from './application/evaluation-orchestrator.service';
import { FeedbackService } from './application/feedback.service';
import { RubricService } from './application/rubric.service';
import { ScoringService } from './domain/scoring.service';
import { EvaluationRepository } from './evaluation.repository';
import { LlmEvaluationProvider } from './infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from './infra/llm-feedback.provider';
import { LlmGoldenProvider } from './infra/llm-golden.provider';
import { LlmRubricProvider } from './infra/llm-rubric.provider';

@Module({
  imports: [ClovaModule, StructuredNormalizerModule],
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
  ],
  exports: [EvaluationOrchestratorService],
})
export class EvaluationModule {}
