import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { EvaluationSystemPrompt, EvaluationUserPrompt } from '../prompt/prompt.template';
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

    // No API key → deterministic fallback
    const apiKey = (process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      return this.fallbackIssues(mustInclude, answerText);
    }

    const messages = [
      { role: 'system' as const, content: EvaluationSystemPrompt },
      {
        role: 'user' as const,
        content: EvaluationUserPrompt(questionSummary, mustInclude, answerText),
      },
    ];

    // First attempt: 추론 출력 후 파싱
    const out1 = await this.clova.chat(messages, {
      temperature: 0,
      maxCompletionTokens: 3000,
      stream: false,
      thinking: { effort: 'medium' },
    });
    const text1 = this.stripNewlines(out1.content ?? '').trim();

    try {
      return this.parseIssuesJson(text1, mustInclude, answerText);
    } catch (e1) {
      this.debugPreview('first', out1.requestId, text1);
      // Retry once with reinforced format reminder
      const reinforce =
        '\n\n[IMPORTANT]\n마크다운/코드블록 금지. 반드시 유효한 JSON 한 줄로만 출력하세요. detail/evidence/target 문자열 값 내부 큰따옴표(\\\") 금지(필요 시 \\\\ \\\" 로 이스케이프). 백틱/줄바꿈 금지. evidence는 1문장·80자 이내로 요약.';
      const out2 = await this.clova.chat(
        [
          { role: 'system' as const, content: EvaluationSystemPrompt },
          {
            role: 'user' as const,
            content: EvaluationUserPrompt(questionSummary, mustInclude, answerText) + reinforce,
          },
        ],
        {
          temperature: 0,
          maxCompletionTokens: 3000,
          stream: false,
          thinking: { effort: 'medium' },
        },
      );
      const text2 = this.stripNewlines(out2.content ?? '').trim();
      try {
        return this.parseIssuesJson(text2, mustInclude, answerText);
      } catch (e2) {
        this.debugPreview('second', out2.requestId, text2);
        // Enhanced debug logging for parse failures
        try {
          const debug1 = (e1 as any)?.message ?? String(e1);
          const debug2 = (e2 as any)?.message ?? String(e2);
          this.logger.warn(`Evaluation parse failed, fallback used. err1=${debug1} err2=${debug2}`);
        } catch {}
        return this.fallbackIssues(mustInclude, answerText);
      }
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
}
