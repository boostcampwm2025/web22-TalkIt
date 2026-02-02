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

    const apiKey = (process.env.CLOVA_API_KEY_FEEDBACK ?? process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      return this.fallback(issues);
    }

    // 캐시에 있는 Golden만 사용(새로 생성하지 않음: 호출 수 절감)
    let goldenJson = '';
    try {
      const cached = await this.golden.getCached(questionSummary);
      if (cached) goldenJson = JSON.stringify(cached);
    } catch (e) {
      this.logger.warn(`Golden cache read failed for feedback: ${(e as any)?.message ?? e}`);
      goldenJson = '';
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

    const out = await this.clova.chat(messages, {
      temperature: 0.2,
      maxCompletionTokens: 10000,
      stream: false,
      apiKey,
    });
    const text = (out.content ?? '').trim();
    this.logResponsePreview('feedback', out.requestId, text);
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
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
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

  private logResponsePreview(stage: string, requestId: string | undefined, text: string) {
    const enabled = (process.env.ASSESS_LLM_LOG ?? '').trim() === '1';
    if (!enabled) return;
    const full = (process.env.ASSESS_LLM_LOG_FULL ?? '').trim() === '1';
    const safeText = String(text ?? '');
    if (full) {
      this.logger.log(
        `[LLM:${stage}] req=${requestId ?? 'n/a'} textLength=${safeText.length} text=${safeText}`,
      );
      return;
    }
    const preview = safeText.replace(/\s+/g, ' ').slice(0, 600);
    this.logger.log(
      `[LLM:${stage}] req=${requestId ?? 'n/a'} textLength=${safeText.length} textPreview=${preview}`,
    );
  }
}
