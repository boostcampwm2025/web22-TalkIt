import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { IssuesPayload, IssuesPayloadSchema } from '../domain/issues.schema';
import { EvaluationSystemPrompt, EvaluationUserPrompt } from '../prompt/prompt.template';

@Injectable()
export class LlmEvaluationProvider {
  private readonly logger = new Logger(LlmEvaluationProvider.name);

  constructor(private readonly clova: ClovaService) {}

  async evaluate(params: {
    questionId: number;
    questionSummary: string;
    mustInclude: string[];
    answerText: string;
  }): Promise<IssuesPayload> {
    const { questionSummary, mustInclude, answerText } = params;

    const apiKey = (process.env.CLOVA_API_KEY ?? '').trim();
    const allowFallback =
      (process.env.ASSESS_EVAL_ALLOW_FALLBACK ?? 'false').toLowerCase() === 'true';
    if (!apiKey && !allowFallback) {
      throw new Error('CLOVA_API_KEY missing and fallback disabled');
    }

    const messages = [
      { role: 'system' as const, content: EvaluationSystemPrompt },
      {
        role: 'user' as const,
        content: EvaluationUserPrompt(questionSummary, mustInclude, answerText),
      },
    ];

    try {
      const out = await this.clova.chat(messages, {
        temperature: 0,
        maxCompletionTokens: 700,
        stream: false,
      });
      const text = out.content ?? '';
      const parsed = IssuesPayloadSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        this.logger.warn(`Clova JSON validation failed: ${parsed.error.message}`);
        if (allowFallback) return this.fallbackHeuristic(mustInclude, answerText);
        throw new Error('LLM response invalid');
      }
      return { ...parsed.data, meta: { ...parsed.data.meta, source: 'llm' } } as any;
    } catch (e) {
      this.logger.warn(`Clova call failed: ${(e as any)?.message ?? e}`);
      if (allowFallback) return this.fallbackHeuristic(mustInclude, answerText);
      throw e;
    }
  }

  private fallbackHeuristic(mustInclude: string[], answerText: string): IssuesPayload {
    const lower = (answerText ?? '').toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    function tokens(phrase: string): string[] {
      return String(phrase)
        .toLowerCase()
        .split(/[^a-z0-9가-힣]+/)
        .filter((t) => t && t.length >= 2);
    }

    for (const k of mustInclude) {
      if (!k) continue;
      const toks = tokens(k);
      const hit = toks.every((t) => lower.includes(t));
      if (hit) matched.push(k);
      else missing.push(k);
    }
    const issues = [
      ...matched.map((m) => ({
        type: 'unclear' as const,
        detail: `'${m}' 언급은 있으나 충분히 명확하지 않음`,
        evidence: m,
        target: m,
        score: -5,
      })),
      ...missing.map((m) => ({
        type: 'missing' as const,
        detail: `'${m}'에 대한 정보가 누락됨`,
        evidence: '',
        target: m,
        score: -15,
      })),
    ];
    return {
      issues,
      meta: { mustIncludeMatched: matched, mustIncludeMissing: missing, source: 'fallback' },
    };
  }
}
