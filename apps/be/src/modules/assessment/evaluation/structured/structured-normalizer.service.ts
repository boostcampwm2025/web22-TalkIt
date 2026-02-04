import { Injectable } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';
import type { JsonSchemaSubset } from '@/infra/clova/schemas/request-body.schema';

import { NormalizerSystemPrompt, NormalizerUserPrompt } from '../prompt/prompt.template';
import { combinedEvaluationSchema, goldenSchema } from '../schemas';

@Injectable()
export class StructuredNormalizerService {
  constructor(private readonly clova: ClovaService) {}

  private systemPrompt = NormalizerSystemPrompt;

  private async normalizeWithSchema(input: string, schema: JsonSchemaSubset): Promise<unknown> {
    type ChatMessage = { role: 'system' | 'user'; content: string };
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: NormalizerUserPrompt(input) },
    ];

    const out = await this.clova.chat(messages, {
      temperature: 0,
      maxCompletionTokens: 3000,
      stream: false,
      responseFormat: { type: 'json', schema },
    });

    return JSON.parse(out.content ?? '');
  }

  async normalizeGolden(text: string): Promise<{
    golden_answer: string;
    key_points: string[];
  }> {
    return this.normalizeWithSchema(text, goldenSchema) as Promise<{
      golden_answer: string;
      key_points: string[];
    }>;
  }

  async normalizeCombined(text: string): Promise<{
    issues: {
      type: 'strength' | 'missing' | 'unclear';
      detail: string;
      evidence?: string;
      target?: string;
      score?: number;
    }[];
    feedback: {
      accurate: string[];
      weakness: string[];
      suggestions: string[];
    };
  }> {
    return this.normalizeWithSchema(text, combinedEvaluationSchema) as Promise<{
      issues: {
        type: 'strength' | 'missing' | 'unclear';
        detail: string;
        evidence?: string;
        target?: string;
        score?: number;
      }[];
      feedback: {
        accurate: string[];
        weakness: string[];
        suggestions: string[];
      };
    }>;
  }
}
