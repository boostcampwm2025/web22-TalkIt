import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ClovaModule } from '../../infra/clova/clova.module';
import { ClovaService } from '../../infra/clova/clova.service';
import { RealClovaStudioClient } from './clients/real-clova.client';
import { CurriculumRepository } from './curriculum.repository';
import { Exporter } from './exporter';
import type { LlmClient } from './llm.client';
import { PromptBuilder } from './prompt.builder';
import { QuestionFactoryService } from './question-factory.service';
import { TermCurriculumRepository } from './term-curriculum.repository';

@Module({
  imports: [ClovaModule, ConfigModule],
  providers: [
    QuestionFactoryService,
    CurriculumRepository,
    TermCurriculumRepository,
    PromptBuilder,
    Exporter,
    {
      provide: 'LlmClient',
      useFactory: (clovaService: ClovaService, config: ConfigService): LlmClient => {
        // Always use the real client; mock implementation removed.
        return new RealClovaStudioClient(clovaService, config);
      },
      inject: [ClovaService, ConfigService],
    },
  ],
  exports: [QuestionFactoryService],
})
export class QuestionFactoryModule {}
