import { Injectable } from '@nestjs/common';

import { AssessmentRepository } from '../../assessment.repository';
import type { IssuesPayload } from '../domain/issues.schema';
import { ScoringService } from '../domain/scoring.service';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from '../infra/llm-feedback.provider';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class EvaluationOrchestratorService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly evalProvider: LlmEvaluationProvider,
    private readonly feedbackProvider: LlmFeedbackProvider,
    private readonly scoring: ScoringService,
  ) {}

  async evaluate(answerId: number): Promise<{ score: number; issues: IssuesPayload }> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');
    const q = answer.question;
    const mustInclude = Array.isArray(q.mustInclude) ? (q.mustInclude as any[]).map(String) : [];
    const questionSummary = String(q.content).slice(0, 200);

    const issuesRaw = await this.evalProvider.evaluate({
      questionId: q.id,
      questionSummary,
      mustInclude,
      answerText: answer.answerText,
    });

    const issues = this.canonicalizeIssuesForScoring(mustInclude, issuesRaw);

    const { score } = this.scoring.score(mustInclude, issues.issues, issues.meta);
    await this.repo.setAnswerScore(answerId, score);

    // Optional: dump evaluation payload to JSONL for debugging/inspection
    try {
      const dumpPath =
        process.env.ASSESS_EVAL_DUMP_PATH ||
        path.join(process.cwd(), 'resource', 'eval_dumps', 'evaluations.jsonl');
      await fsp.mkdir(path.dirname(dumpPath), { recursive: true });
      // Normalize issues for dump: split missing targets and group by type
      const normalized = this.normalizeIssuesForDump(mustInclude, issues);
      const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        answerId,
        questionId: q.id,
        mustInclude,
        issues: normalized,
        score,
      });
      await fsp.appendFile(dumpPath, line + '\n', 'utf8');
    } catch (_) {
      // best-effort only
    }
    return { score, issues };
  }

  async buildFeedback(answerId: number, issues: IssuesPayload): Promise<{ feedback: any }> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');
    const q = answer.question;
    const mustInclude = Array.isArray(q.mustInclude) ? (q.mustInclude as any[]).map(String) : [];
    const questionSummary = String(q.content).slice(0, 200);

    const feedback = await this.feedbackProvider.build({ questionSummary, mustInclude, issues });
    await this.repo.setAnswerFeedback(answerId, feedback as any);
    return { feedback };
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

    // Start with provided issues
    for (const i of payload.issues) {
      if (i.type === 'missing' && (!i.target || i.target === '')) {
        // If missing target unspecified, expand using meta.mustIncludeMissing
        for (const miss of payload.meta?.mustIncludeMissing ?? []) {
          byType.missing.push({
            type: 'missing',
            detail: `'${miss}'에 대한 정보가 누락됨`,
            evidence: '',
            target: miss,
          });
        }
      } else {
        const key = i.type;
        if (byType[key]) byType[key].push(i);
      }
    }

    // Ensure any missing items not represented are added
    const presentMissingTargets = new Set(byType.missing.map((m) => m.target));
    for (const miss of payload.meta?.mustIncludeMissing ?? []) {
      if (!presentMissingTargets.has(miss)) {
        byType.missing.push({
          type: 'missing',
          detail: `'${miss}'에 대한 정보가 누락됨`,
          evidence: '',
          target: miss,
        });
      }
    }

    return { ...byType, meta: payload.meta };
  }

  // Produce issues suitable for scoring/feedback: expand missing by items, ensure targets,
  // and synthesize strength entries for meta.mustIncludeMatched when absent.
  private canonicalizeIssuesForScoring(
    mustInclude: string[],
    payload: IssuesPayload,
  ): IssuesPayload {
    const out: IssuesPayload = { issues: [], meta: payload.meta } as any;
    const seen = new Set<string>();

    function key(t: string, target?: string | null) {
      return `${t}::${target ?? ''}`;
    }

    for (const i of payload.issues ?? []) {
      if (i.type === 'missing' && (!i.target || i.target === '')) {
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

    // Ensure matched items have at least one strength record (avoids 0점/피드백 불일치)
    const matched = new Set(payload.meta?.mustIncludeMatched ?? []);
    const src = payload.meta?.source;
    if (src !== 'fallback') {
      for (const m of matched) {
        const k = key('strength', m);
        if (!seen.has(k)) {
          out.issues.push({
            type: 'strength',
            detail: `'${m}' 개념을 정확히 언급함`,
            evidence: m,
            target: m,
          } as any);
          seen.add(k);
        }
      }
    }

    // Also ensure missing items listed in meta are present
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
