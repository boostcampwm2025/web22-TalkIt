import { Module } from '@nestjs/common';

import { ClovaModule } from '../../infra/clova/clova.module';
import { PromptBuilder } from './prompt.builder';
import { QuestionFactoryService } from './question-factory.service';

@Module({
  imports: [ClovaModule],
  providers: [QuestionFactoryService, PromptBuilder],
  exports: [QuestionFactoryService],
})
export class QuestionFactoryModule {}
