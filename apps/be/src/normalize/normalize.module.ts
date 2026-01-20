import { Module } from '@nestjs/common';

import { LlmCleanupService } from './llm-cleanup.service';
import { NormalizeService } from './normalize.service';

@Module({
  providers: [NormalizeService, LlmCleanupService],
  exports: [NormalizeService],
})
export class NormalizeModule {}
