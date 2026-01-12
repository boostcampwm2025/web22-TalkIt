import { Module } from '@nestjs/common';

import { ClovaModule } from '../../infra/clova/clova.module';
import { ClovaService } from '../../infra/clova/clova.service';
import { RealClovaStudioClient } from './clients/real-clova.client';
import { CurriculumRepository } from './curriculum.repository';
import { Exporter } from './exporter';
import { PromptBuilder } from './prompt.builder';
import { QuestionFactoryService } from './question-factory.service';
import { MockLlmClient } from './stubs/llm.mock';

@Module({
  imports: [ClovaModule],
  providers: [
    QuestionFactoryService,
    CurriculumRepository,
    PromptBuilder,
    Exporter,
    {
      provide: 'LlmClient',
      useFactory: (clovaService: ClovaService) => {
        /* eslint-disable turbo/no-undeclared-env-vars */
        const mode = (process.env.LLM_MODE ?? 'mock').toLowerCase();
        /* eslint-enable turbo/no-undeclared-env-vars */
        if (mode === 'real') {
          return new RealClovaStudioClient(clovaService);
        }
        return new MockLlmClient();
      },
      inject: [ClovaService],
    },
  ],
  exports: [QuestionFactoryService],
})
export class QuestionFactoryModule {}
