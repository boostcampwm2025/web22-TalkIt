import { Injectable } from '@nestjs/common';

import type { Issue, IssuesPayload } from './issues.schema';

@Injectable()
export class ScoringService {
  score(
    mustInclude: string[],
    issues: Issue[],
    meta?: IssuesPayload['meta'],
  ): { score: number; breakdown: any } {
    // 1) If LLM provided deterministic final score, use it
    if (meta?.finalScore != null && meta?.scoreDeterministic) {
      const fs = Math.max(0, Math.min(100, Math.round(meta.finalScore)));
      return { score: fs, breakdown: { mode: 'llm-final' } };
    }

    // 2) If issues have numeric score deltas, aggregate
    const deltas = issues.map((i) => (typeof i.score === 'number' ? i.score : 0));
    if (deltas.some((v) => v !== 0)) {
      const base = 50; // neutral midpoint
      const sum = deltas.reduce((a, b) => a + b, 0);
      const total = Math.max(0, Math.min(100, Math.round(base + sum)));
      return { score: total, breakdown: { mode: 'issue-deltas', base, sum } };
    }

    // 3) Fallback (no scores provided): conservative 0
    return { score: 0, breakdown: { mode: 'none' } };
  }
}
