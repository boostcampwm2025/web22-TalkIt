import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClovaService } from '../../infra/clova/clova.service';
import { QuestionGeneratorService } from './generator/question-generator.service';
import { QuestionBankService } from './question-bank.service';
import { DedupValidatorService } from './validator/dedup-validator.service';

@Module({
  imports: [ConfigModule],
  providers: [ClovaService, QuestionGeneratorService, DedupValidatorService, QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
