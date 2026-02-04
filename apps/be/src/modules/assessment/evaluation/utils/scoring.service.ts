import { Injectable } from '@nestjs/common';

import type { Issue, IssuesPayload, Rubric } from '../dtos';

@Injectable()
export class ScoringService {
  /**
   * 루브릭 기반 점수 산출(0/1/2)
   * 우선순위
   * 1) issues[].type 기반 매핑: strength=2, unclear=1, missing=0
   * 항목별 weight 합산(0..2) 후 0..100으로 환산(total*50)
   */
  computeRubricScore(evaluation: IssuesPayload, rubric: Rubric): number {
    const issueByTarget = new Map<string, Issue['type']>();
    for (const it of evaluation?.issues ?? []) {
      const target = it?.target;
      const type = it?.type;
      if (typeof target === 'string' && typeof type === 'string') {
        issueByTarget.set(target.trim(), type);
      }
    }

    let total = 0;
    for (const item of rubric.items ?? []) {
      const desc = String(item.description ?? '').trim();
      let perItem: number | null = null;
      const t = issueByTarget.get(desc);
      if (t === 'strength') perItem = 2;
      else if (t === 'unclear') perItem = 1;
      else if (t === 'missing') perItem = 0;

      if (perItem == null) perItem = 1;
      total += perItem * Number(item.weight ?? 0);
    }
    const score = Math.round(Math.max(0, Math.min(100, total * 50)));
    return score;
  }
}
