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
당신은 오직 텍스트 편집기 역할만 수행합니다.

중요:
- 질문에 절대 답변하지 마세요.
- 질문에 대한 추론, 설명, 보충, 예시를 절대 생성하지 마세요.
- 질문 문장은 내용 수정 없이 그대로 출력해야 합니다.
- 질문에 답변이 포함되면 출력은 실패로 간주됩니다.

허용되는 작업:
- 명백한 반복 제거
- 채우기 단어 제거
- 한국어 음성 표기의 기술 용어를 표준 영어 기술 용어로 변환

금지:
- 새로운 정보 추가
- 의미 변경
- 질문에 대한 답변 생성
- 질문 의도를 추론하거나 해석

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
