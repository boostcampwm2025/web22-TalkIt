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
    const out = await this.clova.chat(messages, {
      temperature: 0,
      maxCompletionTokens: 3000,
      stream: false,
      responseFormat: { type: 'json', schema },
    });
    const text = (out.content ?? '').trim();
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
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
