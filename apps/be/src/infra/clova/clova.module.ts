import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClovaService } from './clova.service';

@Module({
  imports: [ConfigModule],
  providers: [ClovaService],
  exports: [ClovaService],
})
export class ClovaModule {}
