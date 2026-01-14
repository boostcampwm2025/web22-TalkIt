import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { SttQuestionLoaderService } from './services/stt-question-loader.service';
import { SttService } from './services/stt.service';
import { ClovaSttProvider } from 'src/stt/providers/clova-stt.provider';

@Module({
  imports: [HttpModule],
  providers: [SttService, ClovaSttProvider, SttQuestionLoaderService],
  exports: [SttService],
})
export class SttModule {}
