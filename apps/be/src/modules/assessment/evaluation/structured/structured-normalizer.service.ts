import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaService } from '@/infra/clova/clova.service';
import type { JsonSchemaSubset } from '@/infra/clova/schemas/request-body.schema';

import { NormalizerSystemPrompt, NormalizerUserPrompt } from '../prompt/prompt.template';
import { combinedEvaluationSchema, goldenSchema } from '../schemas';

@Injectable()
export class StructuredNormalizerService {
  constructor(
    private readonly clova: ClovaService,
    private readonly config: ConfigService,
  ) {}

  private readonly logger = new Logger(StructuredNormalizerService.name);
  private systemPrompt = NormalizerSystemPrompt;

  private async normalizeWithSchema(input: string, schema: JsonSchemaSubset): Promise<unknown> {
    type ChatMessage = { role: 'system' | 'user'; content: string };
    const maxChars = Number(this.config.get<string>('ASSESS_NORMALIZE_INPUT_MAX_CHARS') ?? '0');
    const clipped = maxChars > 0 && input.length > maxChars ? input.slice(0, maxChars) : input;
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: NormalizerUserPrompt(clipped) },
    ];
    const startedAt = Date.now();
    const schemaSummary = this.summarizeSchema(schema);
    this.logger.log(
      `LLM normalize request: inputLen=${input.length} clipped=${clipped.length} inputPreview="${this.makePreview(clipped, 200)}" schema=${schemaSummary}`,
    );

    const out = await this.clova.chat(messages, {
      temperature: 0,
      stream: false,
      responseFormat: { type: 'json', schema },
      maxCompletionTokens: Number(this.config.get<string>('CLOVA_SO_MAX_TOKENS') ?? '600'),
      thinking: { effort: 'none' },
    });

    const content = out.content ?? '';
    this.logger.log(
      `LLM normalize response: elapsedMs=${Date.now() - startedAt} contentLen=${content.length} preview="${this.makePreview(content, 200)}"`,
    );
    try {
      return JSON.parse(content);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `LLM normalize JSON parse failed: ${message} contentPreview="${this.makePreview(content, 400)}" schema=${schemaSummary}`,
      );
      throw e;
    }
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

  private makePreview(input: string, limit = 200): string {
    return String(input ?? '')
      .replace(/\s+/g, ' ')
      .slice(0, limit);
  }

  private summarizeSchema(schema: JsonSchemaSubset): string {
    if (!schema || typeof schema !== 'object') return 'unknown';
    const type = (schema as { type?: string | string[] }).type ?? 'object';
    const props = (schema as { properties?: Record<string, JsonSchemaSubset> }).properties ?? {};
    const keys = Object.keys(props);
    return `type=${Array.isArray(type) ? type.join('|') : String(type)} props=${keys.length} [${keys.slice(0, 6).join(',')}]`;
  }
}
