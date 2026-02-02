import { Module } from '@nestjs/common';

import { ClovaModule } from '../clova/clova.module';
import { StructuredNormalizerService } from './structured-normalizer.service';

@Module({
  imports: [ClovaModule],
  providers: [StructuredNormalizerService],
  exports: [StructuredNormalizerService],
})
export class StructuredNormalizerModule {}
