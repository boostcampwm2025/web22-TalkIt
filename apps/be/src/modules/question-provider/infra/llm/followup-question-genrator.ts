import { Injectable, Logger } from '@nestjs/common';

import { FollowupQuestionGeneratorPort } from '../ports/followup-question-generator.port';
import axios from 'axios';

/**
 * LLM raw response shape (infra-only)
 */
interface LlmFollowupQuestionResponse {
  content: string;
  must_include?: unknown;
}

@Injectable()
export class FollowupQuestionGenerator implements FollowupQuestionGeneratorPort {
  private readonly logger = new Logger(FollowupQuestionGenerator.name);

  private readonly apiKey = process.env.CLOVA_API_KEY!;
  private readonly baseUrl = process.env.CLOVA_BASE_URL!;
  private readonly model = process.env.CLOVA_MODEL!;

  async generate(input: { answer: string }): Promise<{
    content: string;
    mustInclude: string[];
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/chat-completions/${this.model}`,
        {
          messages: [
            {
              role: 'system',
              content: [
                {
                  type: 'text',
                  text: `
You are an interviewer conducting a deep technical interview.

Your task:
- Generate ONE follow-up question that digs deeper into the user's answer.
- Identify key points that the follow-up answer MUST include.

Rules:
- Do NOT repeat or restate the user's answer.
- Do NOT include explanations or answers.
- Ask only ONE clear follow-up question.
- Output MUST be valid JSON.
- Output ONLY the JSON, no extra text.

IMPORTANT:
- Do NOT wrap the JSON in markdown or code blocks.
- The output must start with '{' and end with '}'.

JSON format:
{
  "content": "<one follow-up question sentence>",
  "must_include": ["<key point 1>", "<key point 2>", "<key point 3>"]
}

User Answer:
"${input.answer}"
                  `.trim(),
                },
              ],
            },
          ],
          thinking: { effort: 'none' },
          maxCompletionTokens: 256,
          temperature: 0.6,
          topP: 0.9,
          topK: 0,
          repetitionPenalty: 1.1,
          includeAiFilters: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20_000,
        },
      );

      /* ─────────────────────────────────────────────
       * RAW RESPONSE
       * ───────────────────────────────────────────── */
      this.logger.debug('[DEBUG][1] raw response', JSON.stringify(response.data, null, 2));

      const raw = response.data;

      /* ─────────────────────────────────────────────
       * contentText 추출
       * ───────────────────────────────────────────── */
      const contentText =
        raw?.result?.message?.content?.[0]?.text ??
        (typeof raw?.result?.message?.content === 'string'
          ? raw.result.message.content
          : undefined) ??
        raw?.choices?.[0]?.message?.content;

      this.logger.warn('[DEBUG][2] contentText', contentText);

      if (!contentText || typeof contentText !== 'string') {
        throw new Error('INVALID_LLM_RESPONSE_SHAPE');
      }

      /* ─────────────────────────────────────────────
       * JSON 블록 추출
       * ───────────────────────────────────────────── */
      const jsonBlock = this.extractJsonBlock(contentText);

      this.logger.warn('[DEBUG][3] jsonBlock', jsonBlock);

      if (!jsonBlock) {
        throw new Error('NO_JSON_BLOCK_FOUND');
      }

      /* ─────────────────────────────────────────────
       * JSON 안전 파싱 (이중 JSON 대응)
       * ───────────────────────────────────────────── */
      const parsed = this.parseLlmJsonSafely(jsonBlock);

      this.logger.warn('[DEBUG][4] parsed', JSON.stringify(parsed, null, 2));

      /* ─────────────────────────────────────────────
       * must_include 정규화
       * ───────────────────────────────────────────── */
      const mustInclude = this.normalizeMustInclude(parsed.must_include);

      this.logger.warn('[DEBUG][5] mustInclude (normalized)', mustInclude);

      return {
        content: parsed.content.trim(),
        mustInclude,
      };
    } catch (error) {
      this.logger.error('[FollowupQuestionGenerator] LLM call failed, fallback used', error);

      return {
        content:
          '방금 설명한 내용을 실제 시스템 설계에 적용할 때 가장 주의해야 할 점은 무엇인가요?',
        mustInclude: [],
      };
    }
  }

  /**
   * JSON 블록 추출
   */
  private extractJsonBlock(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  /**
   * JSON.parse 최대 2단계
   */
  private parseLlmJsonSafely(jsonText: string): LlmFollowupQuestionResponse {
    let value: unknown = jsonText;

    for (let i = 0; i < 2; i++) {
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
          continue;
        } catch {
          break;
        }
      }
    }

    if (typeof value !== 'object' || value === null || typeof (value as any).content !== 'string') {
      throw new Error('INVALID_LLM_JSON_STRUCTURE');
    }

    return value as LlmFollowupQuestionResponse;
  }

  /**
   * must_include 무조건 배열로 정규화
   */
  private normalizeMustInclude(raw: unknown): string[] {
    const array = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];

    return array
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
}
