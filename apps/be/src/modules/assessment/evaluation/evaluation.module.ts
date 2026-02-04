import { Module } from '@nestjs/common';

import { ClovaModule } from '@/infra/clova/clova.module';

import { AssessmentRepository } from '../assessment.repository';
import { EvaluateService } from './application/evaluate.service';
import { EvaluationOrchestratorService } from './application/evaluation-orchestrator.service';
import { RubricService } from './application/rubric.service';
import { EvaluationRepository } from './evaluation.repository';
import { LlmEvaluationProvider } from './infra/llm-evaluation.provider';
import { LlmRubricProvider } from './infra/llm-rubric.provider';
import { StructuredNormalizerModule } from './structured/structured-normalizer.module';
import { ScoringService } from './utils/scoring.service';

@Module({
  imports: [ClovaModule, StructuredNormalizerModule],
  providers: [
    AssessmentRepository,
    EvaluationRepository,
    EvaluationOrchestratorService,
    EvaluateService,
    RubricService,
    ScoringService,
    LlmEvaluationProvider,
    LlmRubricProvider,
  ],
  exports: [EvaluationOrchestratorService],
})
export class EvaluationModule {}
