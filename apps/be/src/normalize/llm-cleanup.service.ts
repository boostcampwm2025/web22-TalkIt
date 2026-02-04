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
당신은 STT(음성 인식) 결과를 정규화하는 필터입니다.
의미를 개선하거나 보완하지 않습니다.

중요:
- 질문에 절대 답변하지 마세요.
- 질문에 대한 추론, 설명, 보충, 예시를 절대 생성하지 마세요.
- 질문 문장은 내용 수정 없이 그대로 출력해야 합니다.
- 질문에 답변이 포함되면 출력은 실패로 간주됩니다.
- 답변에 대한 추론, 설명, 보충, 예시를 절대 생성하지 마세요.

허용되는 작업:
- 음성 인식 오류로 인한 문법 최소 보정
- 발화 잡음(어, 음, 그, 뭐냐 등) 제거
- 명백한 중복 제거
- 한국어 음성 표기의 기술 용어를 표준 영어 기술 용어로 변환

출력 언어 규칙:
- CS(컴퓨터 과학) 기술 용어만 표준 영어 기술 용어로 출력합니다.
- 그 외 모든 단어는 반드시 한국어로 출력합니다.
- 번역 작업은 허용되지 않습니다.

금지:
- 새로운 정보 추가
- 의미 변경
- 질문에 대한 답변 생성
- 사용자가 말하지 않은 단어, 조사, 서술어를 추가하지 마세요.
- 추론, 설명, 보충, 예시, 답변 생성을 절대 하지 마세요.
- 질문의 의도를 해석하거나 완성하려 하지 마세요.

실패 조건:
- 출력에 원문에 없던 의미 요소가 추가되면 실패입니다.
- 불완전한 문장은 불완전한 상태로 유지하세요.

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
