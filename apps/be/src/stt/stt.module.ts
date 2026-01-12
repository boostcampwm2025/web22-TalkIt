import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { SttService } from './stt.service';
import { ClovaSttProvider } from 'src/stt/providers/clova-stt.provider';

@Module({
  imports: [HttpModule],
  providers: [SttService, ClovaSttProvider],
  exports: [SttService],
})
export class SttModule {}
