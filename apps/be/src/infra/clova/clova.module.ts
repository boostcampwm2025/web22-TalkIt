import { Module } from '@nestjs/common';

import { ClovaService } from './clova.service';

@Module({
  providers: [ClovaService],
  exports: [ClovaService],
})
export class ClovaModule {}
