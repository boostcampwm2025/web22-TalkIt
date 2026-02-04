import { Injectable, Logger } from '@nestjs/common';

import { LlmCleanupService } from './llm-cleanup.service';
import { preNormalize } from './utils/pre-normalize';
import { shouldCallLlm } from './utils/should-call-llm';

@Injectable()
export class NormalizeService {
  constructor(private readonly llmCleanupService: LlmCleanupService) {}
  private readonly logger = new Logger(NormalizeService.name);

  /**
   * STT 원문을 기준으로 전처리/정규화를 거쳐 사용자용 초안을 만든다.
   * 1) rule-based 음차 치환(preNormalize)을 적용하고,
   * 2) 필요 시 LLM 정리를 수행해 더 읽기 쉬운 문장으로 보정한다.
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

    const preNormalizedText = preNormalize(originalText);

    let draftText = preNormalizedText;

    if (shouldCallLlm(preNormalizedText)) {
      try {
        this.logger.debug(`Calling LLM cleanup (length=${preNormalizedText.length})`);
        draftText = await this.llmCleanupService.cleanup(preNormalizedText);
      } catch (error) {
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
