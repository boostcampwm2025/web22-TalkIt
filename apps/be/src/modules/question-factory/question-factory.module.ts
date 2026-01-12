import { Module } from '@nestjs/common';

import { CurriculumRepository } from './curriculum.repository';
import { Exporter } from './exporter';
import { PromptBuilder } from './prompt.builder';
import { QuestionFactoryService } from './question-factory.service';
import { MockLlmClient } from './stubs/llm.mock';

@Module({
  providers: [
    QuestionFactoryService,
    CurriculumRepository,
    PromptBuilder,
    Exporter,
    { provide: 'LlmClient', useClass: MockLlmClient },
  ],
  exports: [QuestionFactoryService],
})
export class QuestionFactoryModule {}
