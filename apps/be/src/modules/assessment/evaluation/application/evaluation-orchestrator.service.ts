import { Injectable } from '@nestjs/common';

import { AssessmentRepository } from '../../assessment.repository';
import type { IssuesPayload } from '../domain/issues.schema';
import { ScoringService } from '../domain/scoring.service';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from '../infra/llm-feedback.provider';
import { KeywordExtractorService } from './keyword-extractor.service';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

type QuestionContext = {
  id: number;
  content: string;
  mustInclude: string[];
};

@Injectable()
export class EvaluationOrchestratorService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly evalProvider: LlmEvaluationProvider,
    private readonly feedbackProvider: LlmFeedbackProvider,
    private readonly scoring: ScoringService,
    private readonly extractor: KeywordExtractorService,
  ) {}

  async evaluate(answerId: number): Promise<{ score: number }> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) {
      throw new Error('ANSWER_NOT_FOUND');
    }

    const q = this.extractQuestionContext(answer);

    const questionSummary = q.content.slice(0, 200);

    const issuesRaw = await this.evalProvider.evaluate({
      questionId: q.id,
      questionSummary,
      mustInclude: q.mustInclude,
      answerText: answer.answerText,
    });

    const issues = this.canonicalizeIssuesForScoring(q.mustInclude, issuesRaw);

    const { score } = this.scoring.score(q.mustInclude, issues.issues, issues.meta);
    await this.repo.setAnswerScore(answerId, score);

    await this.dumpEvaluationIfNeeded({
      answerId,
      questionId: q.id,
      mustInclude: q.mustInclude,
      issues,
      score,
    });

    return { score };
  }

  async buildFeedback(answerId: number): Promise<{ feedback: any }> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) {
      throw new Error('ANSWER_NOT_FOUND');
    }

    const q = this.extractQuestionContext(answer);

    const questionSummary = q.content.slice(0, 200);

    const feedback = await this.feedbackProvider.build({
      questionSummary,
      answerText: String(answer.answerText ?? ''),
      issues: { issues: [], meta: { mustIncludeMatched: [], mustIncludeMissing: [] } } as any,
    });

    // 키워드 가이드라인 준수: 사용자 답변에서만 추출(최대 5개)
    const keywords = this.extractor.extract(answer.answerText);
    const finalFeedback = { ...feedback, keywords } as any;

    await this.repo.setAnswerFeedback(answerId, finalFeedback);
    return { feedback: finalFeedback };
  }

  private extractQuestionContext(answer: any): QuestionContext {
    const q = answer.question ?? answer.extraQuestion;

    if (!q) {
      throw new Error('QUESTION_CONTEXT_NOT_FOUND');
    }

    const mustInclude = Array.isArray(q.mustInclude) ? q.mustInclude.map(String) : [];

    return {
      id: q.id,
      content: String(q.content),
      mustInclude,
    };
  }

  private async dumpEvaluationIfNeeded(params: {
    answerId: number;
    questionId: number;
    mustInclude: string[];
    issues: IssuesPayload;
    score: number;
  }) {
    try {
      const dumpPath =
        process.env.ASSESS_EVAL_DUMP_PATH ||
        path.join(process.cwd(), 'resource', 'eval_dumps', 'evaluations.jsonl');

      await fsp.mkdir(path.dirname(dumpPath), { recursive: true });

      const normalized = this.normalizeIssuesForDump(params.mustInclude, params.issues);

      const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        answerId: params.answerId,
        questionId: params.questionId,
        mustInclude: params.mustInclude,
        issues: normalized,
        score: params.score,
      });

      await fsp.appendFile(dumpPath, line + '\n', 'utf8');
    } catch {
      // best-effort only
    }
  }

  private normalizeIssuesForDump(mustInclude: string[], payload: IssuesPayload) {
    const byType: Record<
      'strength' | 'misconception' | 'missing' | 'unclear' | 'wrong-example',
      any[]
    > = {
      strength: [],
      misconception: [],
      missing: [],
      unclear: [],
      'wrong-example': [],
    };

    for (const i of payload.issues ?? []) {
      if (i.type === 'missing' && !i.target) {
        for (const miss of payload.meta?.mustIncludeMissing ?? []) {
          byType.missing.push({
            type: 'missing',
            detail: `'${miss}'에 대한 정보가 누락됨`,
            evidence: '',
            target: miss,
          });
        }
      } else if (byType[i.type]) {
        byType[i.type].push(i);
      }
    }

    return { ...byType, meta: payload.meta };
  }

  private canonicalizeIssuesForScoring(
    mustInclude: string[],
    payload: IssuesPayload,
  ): IssuesPayload {
    const out: IssuesPayload = { issues: [], meta: payload.meta } as any;
    const seen = new Set<string>();

    const key = (t: string, target?: string | null) => `${t}::${target ?? ''}`;

    for (const i of payload.issues ?? []) {
      if (i.type === 'missing' && !i.target) {
        for (const miss of payload.meta?.mustIncludeMissing ?? []) {
          const k = key('missing', miss);
          if (seen.has(k)) continue;
          out.issues.push({
            type: 'missing',
            detail: `'${miss}'에 대한 정보가 누락됨`,
            evidence: '',
            target: miss,
          } as any);
          seen.add(k);
        }
      } else {
        const k = key(i.type, i.target ?? null);
        if (!seen.has(k)) {
          out.issues.push(i as any);
          seen.add(k);
        }
      }
    }

    for (const miss of payload.meta?.mustIncludeMissing ?? []) {
      const k = key('missing', miss);
      if (!seen.has(k)) {
        out.issues.push({
          type: 'missing',
          detail: `'${miss}'에 대한 정보가 누락됨`,
          evidence: '',
          target: miss,
        } as any);
        seen.add(k);
      }
    }

    return out;
  }
}
