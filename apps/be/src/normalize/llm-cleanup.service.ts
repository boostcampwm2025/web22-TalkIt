import { Injectable, Logger } from '@nestjs/common';

import axios from 'axios';

@Injectable()
export class LlmCleanupService {
  private readonly logger = new Logger(LlmCleanupService.name);

  private readonly apiKey = process.env.CLOVA_API_KEY!;
  private readonly model = process.env.CLOVA_NORMAL_MODEL!;
  private readonly baseUrl = process.env.CLOVA_BASE_URL!;

  async cleanup(text: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat-completions/${this.model}`,
        {
          topK: 0,
          includeAiFilters: true,
          maxTokens: 256,
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: `
You are cleaning up raw speech-to-text output for user editing.

Rules:
- Do NOT add new information.
- Do NOT explain or summarize.
- Do NOT change technical meaning.
- Only remove obvious repetitions and filler words.
- If a technical term is written as a Korean phonetic transcription,
  convert it to its standard English technical term.
- Do NOT convert or reinterpret concepts.
- Keep all other technical terms exactly as-is.
              `.trim(),
            },
            {
              role: 'user',
              content: text,
            },
          ],
          stopBefore: [],
          repeatPenalty: 5.0,
          topP: 0.8,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      const cleaned = response.data?.result?.message?.content;

      if (!cleaned || typeof cleaned !== 'string') {
        this.logger.warn('[LLM Cleanup] Invalid response, fallback');
        return text;
      }

      return cleaned.trim();
    } catch (error) {
      this.logger.error('[LLM Cleanup] failed, fallback', error);
      return text;
    }
  }
}
