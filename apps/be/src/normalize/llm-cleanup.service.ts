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
사용자 편집을 위해 원시 음성-텍스트 출력을 정리하고 있습니다.
당신은 컴퓨터 과학 전문가 입니다.

규칙:
- 새로운 정보를 추가하지 마세요.
- 설명하거나 요약하지 마세요.
- 기술적 의미를 바꾸지 마세요.
- 명백한 반복과 채우기 단어만 제거하세요.
- 기술 용어가 한국어 음성 표기로 작성된 경우,
  표준 영어 기술 용어로 변환합니다.
- 개념을 변환하거나 재해석하지 마세요.
- 다른 모든 기술 용어를 그대로 유지합니다.
- 표준 영어 기술 용어는 무조건 영어로 출력하며, 이외의 문맥은 한국어로 유지합니다.
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
