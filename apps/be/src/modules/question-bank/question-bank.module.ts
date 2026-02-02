import { Module } from '@nestjs/common';

import { ClovaService } from '../../infra/clova/clova.service';
import { QuestionGeneratorService } from './generator/question-generator.service';
import { QuestionBankService } from './question-bank.service';

@Module({
  providers: [ClovaService, QuestionGeneratorService, QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
