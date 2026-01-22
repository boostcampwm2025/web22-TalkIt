import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import type { IssuesPayload } from '../domain/issues.schema';
import { FeedbackSystemPrompt, FeedbackUserPrompt } from '../prompt/prompt.template';

@Injectable()
export class LlmFeedbackProvider {
  private readonly logger = new Logger(LlmFeedbackProvider.name);

  constructor(private readonly clova: ClovaService) {}

  async build(params: {
    questionSummary: string;
    mustInclude: string[];
    issues: IssuesPayload;
  }): Promise<{ accurate: string[]; improvement: string[]; keywords: string[] }> {
    const { questionSummary, mustInclude, issues } = params;

    const apiKey = (process.env.CLOVA_API_KEY ?? '').trim();
    if (!apiKey) {
      return this.fallbackFromIssues(issues);
    }

    const issuesJson = JSON.stringify(issues);
    const messages = [
      { role: 'system' as const, content: FeedbackSystemPrompt },
      {
        role: 'user' as const,
        content: FeedbackUserPrompt(questionSummary, mustInclude, issuesJson),
      },
    ];
    try {
      const out = await this.clova.chat(messages, {
        temperature: 0,
        maxCompletionTokens: 500,
        stream: false,
      });
      const text = (out.content ?? '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = this.prepareLikelyJson(text);
        parsed = JSON.parse(cleaned);
      }
      const accurate = Array.isArray(parsed.accurate)
        ? parsed.accurate.map(String).slice(0, 3)
        : [];
      const improvement = Array.isArray(parsed.improvement)
        ? parsed.improvement.map(String).slice(0, 5)
        : [];
      const keywords = Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).slice(0, 5)
        : [];
      return { accurate, improvement, keywords };
    } catch (e) {
      this.logger.warn(`Clova feedback failed, fallback used: ${(e as any)?.message ?? e}`);
      return this.fallbackFromIssues(issues);
    }
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

    return t.trim();
  }

  private fallbackFromIssues(issues: IssuesPayload): {
    accurate: string[];
    improvement: string[];
    keywords: string[];
  } {
    const accurate: string[] = [];
    const improvement: string[] = [];
    const keywords = new Set<string>();

    for (const i of issues.issues) {
      if (i.type === 'strength') {
        if (i.target) accurate.push(`'${i.target}' 개념을 정확히 설명했습니다.`);
        else accurate.push('핵심 개념을 정확히 설명했습니다.');
      } else if (i.type === 'missing') {
        if (i.target) improvement.push(`'${i.target}' 부분이 누락되어 보완이 필요합니다.`);
        if (i.target) keywords.add(i.target);
      } else if (i.type === 'misconception') {
        const t = i.target ?? '해당 개념';
        improvement.push(`'${t}'에 오해가 있어 올바른 정의와 차이를 다시 정리해 주세요.`);
        if (i.target) keywords.add(i.target);
      } else if (i.type === 'wrong-example') {
        improvement.push('예시가 개념을 정확히 뒷받침하지 못해 적절한 사례로 교체가 필요합니다.');
      } else if (i.type === 'unclear') {
        improvement.push('서론-전개-결론 구조로 핵심을 먼저 제시하면 더 명료합니다.');
      }
    }

    return {
      accurate: accurate.slice(0, 3),
      improvement: improvement.slice(0, 5),
      keywords: Array.from(keywords).slice(0, 5),
    };
  }
}
