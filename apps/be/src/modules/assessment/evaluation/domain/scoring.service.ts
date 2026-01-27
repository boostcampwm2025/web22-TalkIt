import { Injectable } from '@nestjs/common';

import type { Issue, IssuesPayload } from './issues.schema';

@Injectable()
export class ScoringService {
  private readonly penalty = {
    misconception: 0.33, // 중대/경미 구분 불가 → 보수적으로 0.33 적용
    wrongExample: 0.5,
    unclear: 0.7,
  } as const;

  score(
    mustInclude: string[],
    issues: Issue[],
    meta?: IssuesPayload['meta'],
  ): { score: number; breakdown: any } {
    // 0) If LLM provided a deterministic final score, respect it
    if (meta?.finalScore != null && meta?.scoreDeterministic) {
      const fs = clamp01to100(meta.finalScore);
      return { score: fs, breakdown: { mode: 'llm-final' } };
    }

    // 1) Server-side mustInclude-based scoring (feature_design/evaluation.md)
    const N = Math.max(1, mustInclude.length);
    const base = 100 / N;

    const matched = new Set<string>(meta?.mustIncludeMatched ?? []);
    const missing = new Set<string>(meta?.mustIncludeMissing ?? []);

    // 인덱싱: target별 이슈 목록
    const byTarget = new Map<string, Issue[]>();
    for (const i of issues ?? []) {
      const t = i.target ?? '';
      if (!byTarget.has(t)) byTarget.set(t, []);
      byTarget.get(t)!.push(i);
    }

    let sum = 0;
    let strengths = 0;

    for (const key of mustInclude) {
      if (missing.has(key)) {
        // hit=false → 0점
        continue;
      }
      // hit=true → base × M (가장 심각한 이슈 적용)
      let M = 1.0;
      const list = byTarget.get(key) ?? [];
      for (const i of list) {
        if (i.type === 'misconception') M = Math.min(M, this.penalty.misconception);
        else if (i.type === 'unclear') M = Math.min(M, this.penalty.unclear);
        else if (i.type === 'wrong-example') M = Math.min(M, this.penalty.wrongExample);
        else if (i.type === 'strength') strengths += 1; // 보너스 집계
      }
      sum += base * M;
    }

    // 보너스: strength +2/개, 최대 +10
    const bonus = Math.min(strengths * 2, 10);
    const total = clamp01to100(Math.round(sum + bonus));
    return { score: total, breakdown: { mode: 'must-include', base, strengths, bonus, sum } };
  }
}

function clamp01to100(n: number): number {
  const v = Math.round(n);
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}
