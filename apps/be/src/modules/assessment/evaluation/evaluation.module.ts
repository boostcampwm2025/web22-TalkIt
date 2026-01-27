import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluationOrchestratorService } from './application/evaluation-orchestrator.service';
import { FeedbackService } from './application/feedback.service';
import { KeywordExtractorService } from './application/keyword-extractor.service';
import { ScoringService } from './domain/scoring.service';
import { LlmEvaluationProvider } from './infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from './infra/llm-feedback.provider';
import { LlmGoldenProvider } from './infra/llm-golden.provider';

@Module({
  imports: [ClovaModule],
  providers: [
    AssessmentRepository,
    EvaluationOrchestratorService,
    FeedbackService,
    ScoringService,
    KeywordExtractorService,
    LlmEvaluationProvider,
    LlmFeedbackProvider,
    LlmGoldenProvider,
  ],
  exports: [EvaluationOrchestratorService],
})
export class EvaluationModule {}
