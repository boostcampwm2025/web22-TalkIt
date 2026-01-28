import { Injectable, Logger } from '@nestjs/common';

import { LlmCleanupService } from './llm-cleanup.service';
import { preNormalize } from './utils/pre-normalize';
import { shouldCallLlm } from './utils/should-call-llm';

@Injectable()
export class NormalizeService {
  constructor(private readonly llmCleanupService: LlmCleanupService) {}
  private readonly logger = new Logger(NormalizeService.name);

  /**
   * 사용자에게 보여줄 Draft 텍스트 생성
   * (STT 이후, User Edit 이전)
   */
  async normalizeForDraft(rawText: string): Promise<{
    rawText: string;
    preNormalizedText: string;
    draftText: string;
  }> {
    const originalText = rawText ?? '';

    if (!originalText.trim()) {
      return {
        rawText: originalText,
        preNormalizedText: '',
        draftText: '',
      };
    }

    //  Pre-Normalization (rule-based, 음차만)
    const preNormalizedText = preNormalize(originalText);

    //  LLM Cleanup (User-friendly, optional)
    let draftText = preNormalizedText;

    if (shouldCallLlm(preNormalizedText)) {
      try {
        this.logger.debug(`Calling LLM cleanup (length=${preNormalizedText.length})`);
        draftText = await this.llmCleanupService.cleanup(preNormalizedText);
      } catch (error) {
        // 실패 시 반드시 fallback
        this.logger.warn('LLM cleanup failed, falling back to preNormalizedText', error);
        draftText = preNormalizedText;
      }
    }

    return {
      rawText: originalText,
      preNormalizedText,
      draftText,
    };
  }
}
