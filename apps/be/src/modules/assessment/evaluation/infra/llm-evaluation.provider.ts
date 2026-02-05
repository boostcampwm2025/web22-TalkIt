import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaService } from '@/infra/clova/clova.service';
import type { ChatMessage } from '@/infra/clova/dtos/types';

import type { Rubric } from '../dtos';
import { EvaluationAndFeedbackUserPrompt, EvaluationSystemPrompt } from '../prompt/prompt.template';

@Injectable()
export class LlmEvaluationProvider {
  private readonly logger = new Logger(LlmEvaluationProvider.name);
  constructor(
    private readonly clova: ClovaService,
    private readonly config: ConfigService,
  ) {}

  async evaluate(params: {
    questionSummary: string;
    rubric: Rubric;
    answerText: string;
  }): Promise<string> {
    const { questionSummary, rubric, answerText } = params;
    const maxAnswerChars = Number(this.config.get<string>('ASSESS_EVAL_ANSWER_MAX_CHARS') ?? '0');
    const clippedAnswer =
      maxAnswerChars > 0 && answerText.length > maxAnswerChars
        ? answerText.slice(0, maxAnswerChars)
        : answerText;
    const mustInclude = this.buildMustInclude(rubric);
    if (!this.hasApiKey()) {
      this.logger.warn('CLOVA_API_KEY missing. Using heuristic fallback for evaluation.');
      return this.buildFallbackCombinedJson(mustInclude, clippedAnswer);
    }

    const messages = this.buildMessages(questionSummary, mustInclude, clippedAnswer);
    const startedAt = Date.now();
    const answerPreview = this.makePreview(clippedAnswer, 200);
    this.logger.log(
      `LLM evaluate request: qSummaryLen=${questionSummary.length} mustInclude=${mustInclude.length} answerLen=${clippedAnswer.length} answerPreview="${answerPreview}"`,
    );
    try {
      const out = await this.clova.chat(messages, {
        temperature: 0,
        stream: false,
        maxCompletionTokens: Number(this.config.get<string>('CLOVA_THINKING_MAX_TOKENS') ?? '1200'),
        thinking: { effort: 'low' },
      });
      const responsePreview = this.makePreview(out.content ?? '', 200);
      this.logger.log(
        `LLM evaluate response: elapsedMs=${Date.now() - startedAt} contentLen=${(out.content ?? '').length} preview="${responsePreview}"`,
      );
      return (out.content ?? '').trim();
    } catch (e) {
      this.logger.warn(
        `Evaluation Thinking call failed, fallback used: ${String((e as Error)?.message || e)}`,
      );
      return this.buildFallbackCombinedJson(mustInclude, clippedAnswer);
    }
  }

  private buildFallbackCombinedJson(mustInclude: string[], answerText: string): string {
    const ans = String(answerText ?? '').toLowerCase();
    const inferMatch = (desc: string): boolean => {
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
        type: 'strength',
        detail: `${m} 항목이 부분적으로 충족된 것으로 보입니다.`,
        evidence: '',
        target: m,
        score: 2,
      })),
      ...missing.map((m) => ({
        type: 'missing',
        detail: `${m} 항목에 대한 언급이 부족합니다.`,
        evidence: '',
        target: m,
        score: 0,
      })),
    ];
    const fallback = { issues, feedback: { accurate: [], weakness: [], suggestions: [] } };
    return JSON.stringify(fallback);
  }

  private buildMustInclude(rubric: Rubric): string[] {
    return (rubric.items ?? [])
      .map((it) => String(it?.description ?? '').trim())
      .filter((s) => s.length > 0);
  }

  private hasApiKey(): boolean {
    return Boolean((this.config.get<string>('CLOVA_API_KEY') ?? '').trim());
  }

  private buildMessages(
    questionSummary: string,
    mustInclude: string[],
    answerText: string,
  ): ChatMessage[] {
    const system = EvaluationSystemPrompt;
    const user = EvaluationAndFeedbackUserPrompt(questionSummary, mustInclude, answerText);
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  private makePreview(input: string, limit = 200): string {
    return String(input ?? '')
      .replace(/\s+/g, ' ')
      .slice(0, limit);
  }
}
