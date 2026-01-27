import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { GoldenSystemPrompt, GoldenUserPrompt } from '../prompt/prompt.template';

@Injectable()
export class LlmGoldenProvider {
  private readonly logger = new Logger(LlmGoldenProvider.name);
  constructor(private readonly clova: ClovaService) {}

  async generate(params: { questionSummary: string }): Promise<{
    definition: string;
    key_points: string[];
    examples?: string[];
    pitfalls?: string[];
  }> {
    const { questionSummary } = params;
    const messages = [
      { role: 'system' as const, content: GoldenSystemPrompt },
      { role: 'user' as const, content: GoldenUserPrompt(questionSummary) },
    ];
    const out = await this.clova.chat(messages, {
      temperature: 0,
      maxCompletionTokens: 700,
      stream: false,
    });
    const text = (out.content ?? '').trim();
    // 1) 직파싱 → 2) 정리 후 파싱 → 3) 재요청(강조) → 실패 시 폴백
    try {
      return this.parseGoldenJson(text, questionSummary);
    } catch {
      // reinforce
      const reinforce = '\n\n[IMPORTANT]\n마크다운/코드블록 금지. 반드시 유효한 JSON 한 줄로만 출력하세요.';
      const out2 = await this.clova.chat(
        [
          { role: 'system' as const, content: GoldenSystemPrompt },
          { role: 'user' as const, content: GoldenUserPrompt(questionSummary) + reinforce },
        ],
        { temperature: 0, maxCompletionTokens: 700, stream: false },
      );
      const text2 = (out2.content ?? '').trim();
      try {
        return this.parseGoldenJson(text2, questionSummary);
      } catch (e2) {
        this.logger.warn(
          `Golden parse failed, falling back minimal: ${(e2 as any)?.message ?? e2}`,
        );
        return { definition: questionSummary, key_points: [] };
      }
    }
  }

  private parseGoldenJson(text: string, questionSummary: string) {
    try {
      const json = JSON.parse(text);
      return this.toGolden(json, questionSummary);
    } catch {
      const cleaned = this.prepareLikelyJson(text);
      const json = JSON.parse(cleaned);
      return this.toGolden(json, questionSummary);
    }
  }

  private toGolden(json: any, questionSummary: string) {
    const def = String(json?.definition ?? questionSummary);
    const kp = Array.isArray(json?.key_points) ? json.key_points.map(String) : [];
    const ex = Array.isArray(json?.examples) ? json.examples.map(String) : [];
    const pf = Array.isArray(json?.pitfalls) ? json.pitfalls.map(String) : [];
    return { definition: def, key_points: kp, examples: ex, pitfalls: pf };
  }

  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();
    if (t.startsWith('```')) {
      t = t.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```\s*$/, '').trim();
    }
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      t = t.slice(first, last + 1);
    }
    t = t.replace(/,\s*([}\]])/g, '$1');
    return t.trim();
  }
}
