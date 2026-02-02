import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { CombinedSystemPrompt, CombinedUserPrompt } from '../prompt/prompt.template';
import fs from 'node:fs';
import path from 'node:path';

// Local output schema (self-contained)
type IssueType = 'strength' | 'missing' | 'unclear';
type Issue = {
  type: IssueType;
  detail: string;
  evidence?: string;
  target?: string | null;
  score?: number; // expected 0|1|2
};
type IssuesMeta = {
  mustIncludeMatched?: string[];
  mustIncludeMissing?: string[];
  source?: 'llm' | 'fallback';
  finalScore?: number;
  scoreDeterministic?: boolean;
  offTopic?: boolean;
  reason?: string;
};
type IssuesPayload = { issues: Issue[]; meta: IssuesMeta };
type FeedbackPayload = { accurate: string[]; weakness: string[]; suggestions: string[] };
type CombinedPayload = { issues: Issue[]; feedback: FeedbackPayload };

type RubricLike = {
  items: { key: string; description: string; weight: number }[];
  scale: '0-2';
};

@Injectable()
export class LlmEvaluationProvider {
  private readonly logger = new Logger(LlmEvaluationProvider.name);
  constructor(private readonly clova: ClovaService) {}

  async evaluate(params: {
    questionSummary: string;
    rubric: RubricLike;
    answerText: string;
  }): Promise<IssuesPayload> {
    const { questionSummary, rubric, answerText } = params;

    const mustInclude = (rubric?.items ?? [])
      .map((it) => String(it?.description ?? '').trim())
      .filter((s) => s.length > 0);
    // 피드백 길이 제한을 위해 루브릭 항목 상한 적용
    const maxItems = Number(process.env.ASSESS_RUBRIC_MAX_ITEMS ?? '6');
    const limitedMustInclude = mustInclude.slice(0, Math.max(1, maxItems));

    // 기존 단일 평가 호출 로직은 유지하되, 현재는 Combined 호출로 대체됨.
    // (요청에 따라 기존 로직은 주석 처리)
    // No API key → deterministic fallback
    const apiKey = (process.env.CLOVA_API_KEY_EVAL ?? process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      return this.fallbackIssues(mustInclude, answerText);
    }

    // 기존 평가용 프롬프트는 현재 사용하지 않음 (컴파일 오류 방지용)
    // const messages = [
    //   { role: 'system' as const, content: EvaluationSystemPrompt },
    //   {
    //     role: 'user' as const,
    //     content: EvaluationUserPrompt(questionSummary, mustInclude, answerText),
    //   },
    // ];

    // 기존 단일 평가 호출 로직은 잠시 사용하지 않음
    // (아래 로직은 참고용으로 보관)
    // const out1 = await this.clova.chat(...)
    // return this.parseIssuesJson(...)
    return this.fallbackIssues(mustInclude, answerText);
  }

  // 새 구조: 평가 + 피드백을 1회 호출로 생성
  async evaluateWithFeedback(params: {
    questionSummary: string;
    rubric: RubricLike;
    answerText: string;
    goldenJson: string;
  }): Promise<CombinedPayload> {
    const { questionSummary, rubric, answerText, goldenJson } = params;
    const mustInclude = (rubric?.items ?? [])
      .map((it) => String(it?.description ?? '').trim())
      .filter((s) => s.length > 0);
    // 피드백 길이 제한을 위해 루브릭 항목 상한 적용
    const maxItems = Number(process.env.ASSESS_RUBRIC_MAX_ITEMS ?? '6');
    const limitedMustInclude = mustInclude.slice(0, Math.max(1, maxItems));

    const apiKey = (process.env.CLOVA_API_KEY_EVAL ?? process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      const issues = this.fallbackIssues(limitedMustInclude, answerText).issues ?? [];
      const feedback = this.fallbackFeedback(issues);
      return { issues, feedback };
    }

    const messages = [
      { role: 'system' as const, content: CombinedSystemPrompt },
      {
        role: 'user' as const,
        content: CombinedUserPrompt(questionSummary, goldenJson, limitedMustInclude, answerText),
      },
    ];

    const out = await this.clova.chat(messages, {
      temperature: 0.2,
      maxCompletionTokens: 3000,
      stream: false,
      apiKey,
    });
    const text = this.stripNewlines(out.content ?? '').trim();
    this.logResponsePreview('evaluation:combined', out.requestId, text);

    try {
      return this.parseCombinedJson(text, limitedMustInclude, answerText);
    } catch (e1) {
      this.debugPreview('combined', out.requestId, text);
      // 실패 시 폴백 (LLM 추가 호출 없음)
      const issues = this.fallbackIssues(limitedMustInclude, answerText).issues ?? [];
      const feedback = this.fallbackFeedback(issues);
      return { issues, feedback };
    }
  }

  private parseIssuesJson(text: string, mustInclude: string[], answerText: string): IssuesPayload {
    const allowedTypes = new Set(['strength', 'missing', 'unclear']);
    const coerceType = (t: any) => (allowedTypes.has(String(t)) ? (String(t) as any) : 'unclear');

    const tryParse = (s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        const cleaned = this.prepareLikelyJson(s);
        return JSON.parse(cleaned);
      }
    };
    const raw = tryParse(text);
    const issuesRaw = Array.isArray(raw?.issues) ? raw.issues : [];
    const issues = issuesRaw
      .map((it: any) => ({
        type: coerceType(it?.type),
        detail: String(it?.detail ?? '').trim() || '세부 설명 없음',
        evidence: it?.evidence ? String(it.evidence) : undefined,
        target: it?.target == null || it?.target === '' ? null : String(it.target),
        score: typeof it?.score === 'number' ? it.score : undefined,
      }))
      .filter((it: any) => it.detail.length > 0);

    return {
      issues,
      meta: {
        source: 'llm',
      },
    };
  }

  private parseCombinedJson(
    text: string,
    mustInclude: string[],
    answerText: string,
  ): CombinedPayload {
    const raw = (() => {
      try {
        return JSON.parse(text);
      } catch {
        const cleaned = this.prepareLikelyJson(text);
        return JSON.parse(cleaned);
      }
    })();

    const issuesPayload = this.parseIssuesJson(
      JSON.stringify({ issues: raw?.issues ?? [] }),
      mustInclude,
      answerText,
    );
    const feedbackRaw = raw?.feedback ?? {};
    const toArr = (x: any) => (Array.isArray(x) ? x.map((s) => String(s)) : []);
    const feedback: FeedbackPayload = {
      accurate: toArr(feedbackRaw?.accurate),
      weakness: toArr(feedbackRaw?.weakness),
      suggestions: toArr(feedbackRaw?.suggestions),
    };
    return { issues: issuesPayload.issues, feedback };
  }

  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();
    // Remove code fences
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    // Flatten raw newlines to spaces to avoid invalid JSON strings
    t = t.replace(/[\r\n]+/g, ' ');
    // Smart quotes → straight quotes
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");
    // Extract only the first balanced JSON object
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
    // Remove trailing commas
    t = t.replace(/,\s*([}\]])/g, '$1');
    return t.trim();
  }

  // Ensure model output is one line by removing raw newlines
  private stripNewlines(s: string): string {
    const input = String(s ?? '');
    if (!/[\r\n]/.test(input)) return input;
    const flattened = input.replace(/[\r\n]+/g, ' ');
    if ((process.env.ASSESS_EVAL_DEBUG ?? '') === '1') {
      try {
        this.logger.debug(
          `[EvalDebug] flattened newlines: raw_len=${input.length} flat_len=${flattened.length}`,
        );
      } catch {}
    }
    return flattened;
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

  // Debug helper: log parse failure context when ASSESS_EVAL_DEBUG=1
  private debugPreview(stage: string, requestId: string | undefined, text: string) {
    if ((process.env.ASSESS_EVAL_DEBUG ?? '') !== '1') return;
    const preview = (v: string, n = 400) => v.replace(/\s+/g, ' ').slice(0, n);
    const cleaned = this.prepareLikelyJson(text);
    const rawLen = text.length;
    const cleanLen = cleaned.length;
    // Use logger.debug to avoid noisy warnings in production
    this.logger.debug(
      `[EvalDebug:${stage}] req=${requestId ?? 'n/a'} raw_len=${rawLen} clean_len=${cleanLen} text_preview=${preview(
        text,
      )} cleaned_preview=${preview(cleaned)}`,
    );

    // Optional file dump if a directory is provided
    const dumpDir = (process.env.ASSESS_EVAL_DEBUG_DIR ?? '').trim();
    if (dumpDir) {
      try {
        fs.mkdirSync(dumpDir, { recursive: true });
        const base = path.join(dumpDir, `eval_${requestId ?? Date.now()}_${stage}`);
        fs.writeFileSync(base + '_raw.txt', text);
        fs.writeFileSync(base + '_cleaned.json', cleaned);
      } catch (e) {
        // ignore write errors in debug mode
      }
    }
  }

  private fallbackIssues(mustInclude: string[], answerText: string): IssuesPayload {
    const ans = String(answerText ?? '').toLowerCase();
    const inferMatch = (desc: string) => {
      const tokens = desc
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2);
      return tokens.some((tk) => ans.includes(tk));
    };
    const matched: string[] = [];
    const missing: string[] = [];
    for (const m of mustInclude) {
      if (inferMatch(m)) matched.push(m);
      else missing.push(m);
    }
    const issues = [
      ...matched.map((m) => ({
        type: 'strength' as const,
        detail: `${m} 항목이 부분적으로 충족된 것으로 보입니다.`,
        evidence: undefined,
        target: m,
        score: 2,
      })),
      ...missing.map((m) => ({
        type: 'missing' as const,
        detail: `${m} 항목에 대한 언급이 부족합니다.`,
        evidence: undefined,
        target: m,
        score: 0,
      })),
    ];
    return {
      issues,
      meta: {
        mustIncludeMatched: matched,
        mustIncludeMissing: missing,
        source: 'fallback',
      },
    } as IssuesPayload;
  }

  private fallbackFeedback(issues: Issue[]): FeedbackPayload {
    const accurate: string[] = [];
    const weakness: string[] = [];
    const suggestions: string[] = [];
    for (const i of issues ?? []) {
      const t = String(i?.type ?? '');
      const target = String((i as any)?.target ?? '').trim();
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
}
