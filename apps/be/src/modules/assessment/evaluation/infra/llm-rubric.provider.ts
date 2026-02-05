import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaService } from '@/infra/clova/clova.service';
import type { ChatMessage } from '@/infra/clova/dtos/types';

import type { Rubric, RubricItem } from '../dtos';
import { GoldenSystemPrompt, GoldenUserPrompt } from '../prompt/prompt.template';
import { StructuredNormalizerService } from '../structured/structured-normalizer.service';

@Injectable()
export class LlmRubricProvider {
  constructor(
    private readonly clova: ClovaService,
    private readonly config: ConfigService,
    private readonly normalizer: StructuredNormalizerService,
  ) {}

  /**
   * question 텍스트를 기반으로 모범답안(Golden)을 Thinking 모드로 생성합니다.
   */
  async generate(params: { question: string }): Promise<Rubric> {
    const { question: questionSummary } = params;

    // API 키 확인(Config 기반)
    if (!this.hasApiKey()) return this.fallbackRubric();

    try {
      const messages = this.buildGoldenMessages(questionSummary);
      const rawGolden = await this.callGolden(messages);
      return await this.toRubricFromGoldenText(rawGolden);
    } catch {
      return this.fallbackRubric();
    }
  }

  private fallbackRubric(): Rubric {
    const items = this.distributeWeights(this.defaultItems());
    return { items, scale: '0-2' };
  }

  private defaultItems(): RubricItem[] {
    return [
      { description: '핵심 개념의 정의를 정확히 설명한다.', weight: 0 },
      { description: '핵심 포인트를 누락 없이 포괄적으로 다룬다.', weight: 0 },
      { description: '적절한 예시로 개념의 이해를 보강한다.', weight: 0 },
    ];
  }

  private distributeWeights(items: RubricItem[]): RubricItem[] {
    const n = items.length || 3;
    const w = Number((1 / n).toFixed(3));
    return items.map((it) => ({ description: it.description, weight: w }));
  }

  private hasApiKey(): boolean {
    return Boolean((this.config.get<string>('CLOVA_API_KEY') ?? '').trim());
  }

  private buildGoldenMessages(question: string): ChatMessage[] {
    return [
      { role: 'system', content: GoldenSystemPrompt },
      { role: 'user', content: GoldenUserPrompt(question) },
    ];
  }

  private async callGolden(messages: ChatMessage[]): Promise<string> {
    const out = await this.clova.chat(messages, {
      temperature: 0,
      stream: false,
      maxCompletionTokens: 1500,
      thinking: { effort: 'none' },
    });
    return (out.content ?? '').trim();
  }

  private async toRubricFromGoldenText(text: string): Promise<Rubric> {
    // 정규화 수행
    const golden = await this.normalizer.normalizeGolden(text);

    // const golden = JSON.parse(text) as {
    //   golden_answer: string;
    //   key_points: string[];
    // };
    const points: string[] = Array.isArray(golden.key_points) ? golden.key_points : [];
    const items: RubricItem[] =
      points.length > 0
        ? points.map((desc, i) => ({
            description: String(desc).trim() || `핵심 포인트 ${i + 1}`,
            weight: 0,
          }))
        : this.defaultItems();
    return { items: this.distributeWeights(items), scale: '0-2' };
  }
}
