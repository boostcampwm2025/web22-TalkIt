import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { FeedbackSystemPrompt, FeedbackUserPrompt } from '../prompt/prompt.template';
import { LlmGoldenProvider } from './llm-golden.provider';

@Injectable()
export class LlmFeedbackProvider {
  private readonly logger = new Logger(LlmFeedbackProvider.name);

  constructor(
    private readonly clova: ClovaService,
    private readonly golden: LlmGoldenProvider,
  ) {}

  async build(params: {
    questionSummary: string;
    answerText: string;
    issues: { issues: any[]; meta?: any };
  }): Promise<{ accurate: string[]; weakness: string[]; suggestions: string[] }> {
    const { questionSummary, answerText, issues } = params;

    const apiKey = (process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      return this.fallback(issues);
    }

    // Optionally provide golden as extra context
    let goldenJson = '';
    try {
      const golden = await this.golden.generate({ questionSummary });
      goldenJson = JSON.stringify(golden);
    } catch (e) {
      this.logger.warn(`Golden generation failed for feedback: ${(e as any)?.message ?? e}`);
      goldenJson = JSON.stringify({ definition: questionSummary, key_points: [] });
    }

    const messages = [
      { role: 'system' as const, content: FeedbackSystemPrompt },
      {
        role: 'user' as const,
        content: FeedbackUserPrompt(
          questionSummary,
          goldenJson,
          JSON.stringify(issues),
          answerText,
        ),
      },
    ];

    const feedbackSchema: any = {
      type: 'object',
      properties: {
        accurate: { type: 'array', items: { type: 'string' } },
        weakness: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['accurate', 'weakness', 'suggestions'],
    };

    const out = await this.clova.chat(messages, {
      temperature: 0,
      maxCompletionTokens: 3000,
      stream: false,
      responseFormat: { type: 'json', schema: feedbackSchema },
    });
    const text = (out.content ?? '').trim();
    try {
      const parsed = JSON.parse(text);
      return this.normalizeFeedback(parsed);
    } catch {
      try {
        const parsed = JSON.parse(this.prepareLikelyJson(text));
        return this.normalizeFeedback(parsed);
      } catch (e2) {
        this.logger.warn(`Feedback parse failed, fallback used: ${(e2 as any)?.message ?? e2}`);
        return this.fallback(issues);
      }
    }
  }

  private fallback(issues: { issues: any[] }) {
    const accurate: string[] = [];
    const weakness: string[] = [];
    const suggestions: string[] = [];
    for (const i of issues?.issues ?? []) {
      const t = String(i?.type ?? '');
      const target = String(i?.target ?? '').trim();
      if (t === 'strength') {
        accurate.push(
          target ? `${target}을 정확하게 설명했어요.` : '핵심 개념을 정확하게 설명했어요.',
        );
      } else if (t === 'missing' || t === 'unclear' || t === 'misconception') {
        if (target) weakness.push(`${target}에 대한 설명을 보완해 주세요.`);
        if (target)
          suggestions.push(
            `‘${target}’의 핵심 정의를 한두 문장으로 정리하고 왜 중요한지 간단한 예시와 함께 보충해 보세요.`,
          );
      }
    }
    return {
      accurate: accurate.slice(0, 3),
      weakness: weakness.slice(0, 5),
      suggestions: suggestions.slice(0, 5),
    };
  }

  // Normalize various feedback shapes into { accurate, weakness, suggestions }
  private normalizeFeedback(v: any): {
    accurate: string[];
    weakness: string[];
    suggestions: string[];
  } {
    const toArr = (x: any) => (Array.isArray(x) ? x.map((s) => String(s)) : []);
    const accurate = toArr(v?.accurate);
    // Merge legacy keys if present
    const weakness = [...toArr(v?.weakness), ...toArr(v?.unanswered), ...toArr(v?.confused)];
    const suggestions = toArr(v?.suggestions ?? v?.improvement);
    return { accurate, weakness, suggestions };
  }

  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();
    // 코드블록 제거
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    // 스마트 따옴표 치환
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");

    // 첫 번째 완결된 JSON 객체만 절취(여러 객체/설명 혼재 대응)
    const i0 = t.indexOf('{');
    if (i0 >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = i0; i < t.length; i++) {
        const ch = t[i];
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
              t = t.slice(i0, i + 1);
              break;
            }
          }
        }
      }
    }
    // 흔한 오류: 트레일링 콤마 제거
    t = t.replace(/,\s*([}\]])/g, '$1');
    return t.trim();
  }
}
