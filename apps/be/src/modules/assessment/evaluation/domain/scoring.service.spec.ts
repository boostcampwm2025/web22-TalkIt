import type { Issue } from './issues.schema';
import { ScoringService } from './scoring.service';

describe('ScoringService', () => {
  const svc = new ScoringService();

  it('scores 100 when all mustInclude are correctly covered with no issues', () => {
    const must = ['A', 'B', 'C'];
    const issues: Issue[] = [
      { type: 'strength', detail: 'ok', evidence: '', target: 'A' },
      { type: 'strength', detail: 'ok', evidence: '', target: 'B' },
      { type: 'strength', detail: 'ok', evidence: '', target: 'C' },
    ];
    const { score } = svc.score(must, issues);
    expect(score).toBe(100);
  });

  it('applies penalties and bonus correctly', () => {
    const must = ['A', 'B', 'C'];
    const issues: Issue[] = [
      { type: 'strength', detail: 'ok', evidence: '', target: 'A' }, // +base + bonus 2
      { type: 'missing', detail: 'miss', evidence: '', target: 'B' }, // 0
      { type: 'misconception', detail: 'major', evidence: '', target: 'C' }, // base*0.33
    ];
    const { score } = svc.score(must, issues);
    // base = 33.33..; total ~= 33.33 + 11.11 + 2 = 46.44 → rounded ~46
    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(47);
  });
});
