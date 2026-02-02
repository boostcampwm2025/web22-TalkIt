import { Injectable } from '@nestjs/common';

import { ClovaService } from '../clova/clova.service';

@Injectable()
export class StructuredNormalizerService {
  constructor(private readonly clova: ClovaService) {}

  private systemPrompt =
    'You are a strict JSON normalizer. Given any noisy or partial content, output ONLY a valid JSON object that conforms exactly to the provided JSON Schema. Do not include explanations, code fences, or extra text. If a field is unknown, use empty values of the correct type. Output must be a single-line JSON string.';

  private async normalizeWithSchema(input: string, schema: any): Promise<any> {
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      {
        role: 'user' as const,
        content:
          'Normalize the following content into the exact JSON matching the schema. Content:\n' +
          String(input ?? ''),
      },
    ];
    // 1차: SO 사용
    try {
      const out = await this.clova.chat(messages, {
        temperature: 0,
        maxCompletionTokens: 3000,
        stream: false,
        responseFormat: { type: 'json', schema },
      });
      const text = (out.content ?? '').trim();
      return JSON.parse(text);
    } catch {}

    // 2차 폴백: SO 미사용 + JSON-only 강제 프롬프트, thinking 파라미터는 비전송(noThinking)
    const reinforce =
      '\n\n[IMPORTANT]\n출력은 오직 한 줄의 유효한 JSON 객체만 허용됩니다. 추가 텍스트/설명/코드블록 금지. 스키마에 정의되지 않은 키 금지.';
    const out2 = await this.clova.chat(
      [
        { role: 'system' as const, content: this.systemPrompt },
        {
          role: 'user' as const,
          content:
            'Normalize the following content into the exact JSON matching the schema. Content:\n' +
            String(input ?? '') +
            reinforce,
        },
      ],
      { temperature: 0, maxCompletionTokens: 3000, stream: false, noThinking: true },
    );
    const text2 = (out2.content ?? '').trim();
    return this.tryParseLikelyJson(text2);
  }

  private tryParseLikelyJson(s: string): any {
    const cleaned = this.extractFirstJsonObject(String(s ?? ''));
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  private extractFirstJsonObject(t: string): string {
    let text = String(t).trim();
    if (text.startsWith('```')) {
      text = text
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    const i0 = text.indexOf('{');
    if (i0 >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = i0; i < text.length; i++) {
        const ch = text[i];
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === '\\') {
            esc = true;
          } else if (ch === '"') {
            inStr = false;
          }
        } else {
          if (ch === '"') inStr = true;
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              text = text.slice(i0, i + 1);
              break;
            }
          }
        }
      }
    }
    return text.replace(/,\s*([}\]])/g, '$1').trim();
  }

  async normalizeEvaluation(text: string): Promise<{ issues: any[] }> {
    const schema = {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['strength', 'missing', 'unclear'] },
              detail: { type: 'string' },
              evidence: { type: 'string' },
              target: { type: ['string', 'null'] },
              score: { type: 'number' },
            },
            required: ['type', 'detail'],
            additionalProperties: false,
          },
        },
      },
      required: ['issues'],
      additionalProperties: false,
    } as const;
    return this.normalizeWithSchema(text, schema);
  }

  async normalizeFeedback(text: string): Promise<{
    accurate: string[];
    weakness: string[];
    suggestions: string[];
  }> {
    const schema = {
      type: 'object',
      properties: {
        accurate: { type: 'array', items: { type: 'string' } },
        weakness: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['accurate', 'weakness', 'suggestions'],
      additionalProperties: false,
    } as const;
    return this.normalizeWithSchema(text, schema);
  }

  async normalizeGolden(text: string): Promise<{
    definition: string;
    key_points: string[];
    pitfalls: string[];
  }> {
    const schema = {
      type: 'object',
      properties: {
        definition: { type: 'string' },
        key_points: { type: 'array', items: { type: 'string' } },
        pitfalls: { type: 'array', items: { type: 'string' } },
      },
      required: ['definition', 'key_points', 'pitfalls'],
      additionalProperties: false,
    } as const;
    return this.normalizeWithSchema(text, schema);
  }
}
