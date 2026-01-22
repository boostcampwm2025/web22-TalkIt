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
      const text = out.content ?? '';
      const parsed = JSON.parse(text);
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
