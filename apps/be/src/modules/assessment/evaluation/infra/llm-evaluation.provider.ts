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
      const text = (out.content ?? '').trim();

      // 1차: 그대로 파싱 시도
      let parsed = IssuesPayloadSchema.safeParse(this.parseJsonStrict(text));
      // 2차: 정리 후 재시도 (코드블록/스마트쿼트/트레일링 콤마 제거 등)
      if (!parsed.success) {
        const cleaned = this.prepareLikelyJson(text);
        try {
          parsed = IssuesPayloadSchema.safeParse(this.parseJsonStrict(cleaned));
        } catch {
          // 무시: 아래 공통 처리
        }
      }

      if (!parsed.success) {
        // 원인 파악을 위한 안전한 프리뷰
        const preview = text.replace(/\s+/g, ' ').slice(0, 300);
        this.logger.warn(
          `Clova JSON validation failed: ${parsed.error.message}; preview='${preview}'`,
        );
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

  /** JSON.parse 래퍼: 예외 메시지를 원형 유지 */
  private parseJsonStrict<T = unknown>(s: string): T {
    return JSON.parse(s) as T;
  }

  /**
   * LLM 출력이 마크다운 코드블록, 스마트 따옴표, 트레일링 콤마 등으로 오염됐을 때
   * 합리적인 범위에서 복구 시도 후 JSON 파싱에 재사용할 수 있게 정리합니다.
   */
  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();

    // 코드블록 백틱 제거
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }

    // 스마트 따옴표 → 일반 큰따옴표로 치환
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");

    // JSON 본문 추출: 첫 '{'부터 마지막 '}'까지
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      t = t.slice(first, last + 1);
    }

    // 흔한 오타: 트레일링 콤마 제거
    t = t.replace(/,\s*([}\]])/g, '$1');

    // 숫자 앞의 '+' 제거 (JSON 미지원) — 문자열 내부는 보존
    t = this.stripLeadingPlusFromNumbers(t);

    return t.trim();
  }

  /** 문자열 리터럴 밖에서 숫자 앞의 '+'를 제거 */
  private stripLeadingPlusFromNumbers(input: string): string {
    let out = '';
    let inString = false;
    let escape = false;
    const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t';

    for (let i = 0; i < input.length; i++) {
      const c = input[i];

      if (inString) {
        out += c;
        if (escape) {
          escape = false;
        } else if (c === '\\') {
          escape = true;
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }

      if (c === '"') {
        inString = true;
        out += c;
        continue;
      }

      if (c === '+') {
        // 앞쪽의 의미있는 문자 탐색
        let j = out.length - 1;
        while (j >= 0 && isSpace(out.charAt(j))) j--;
        const prev = j >= 0 ? out.charAt(j) : '';
        const next = input[i + 1] ?? '';
        const prevOk = prev === ':' || prev === ',' || prev === '[' || prev === '{' || prev === '';
        if (prevOk && /[0-9]/.test(next)) {
          // '+' 스킵
          continue;
        }
      }

      out += c;
    }

    return out;
  }
}
