import { Blueprint } from './types';

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ') // remove punctuation/symbols
    .replace(/\s+/g, ' ')
    .trim();
}

export class Deduplicator {
  private fpSet = new Set<string>();
  private promptsByGroup = new Map<string, string[]>();

  private fingerprint(bp: Blueprint): string {
    const mi = [...bp.must_include]
      .map((s) => normalizeText(s))
      .sort()
      .join(',');
    const key = `${bp.domain}|${bp.topic_id}|${bp.concept_level}|${bp.question_depth}|${mi}`;
    return normalizeText(key);
  }

  private jaccard(a: string, b: string): number {
    const A = new Set(a.split(' '));
    const B = new Set(b.split(' '));
    const inter = new Set([...A].filter((x) => B.has(x)));
    const union = new Set([...A, ...B]);
    return union.size === 0 ? 0 : inter.size / union.size;
  }

  isDuplicate(bp: Blueprint): boolean {
    const fp = this.fingerprint(bp);
    if (this.fpSet.has(fp)) return true;

    const normPrompt = normalizeText(bp.prompt);
    const group = `${bp.domain}|${bp.topic_id}|${bp.concept_level}|${bp.question_depth}`;
    const arr = this.promptsByGroup.get(group) ?? [];
    for (const p of arr) {
      if (this.jaccard(p, normPrompt) >= 0.8) return true;
    }
    // not duplicate; record
    this.fpSet.add(fp);
    arr.push(normPrompt);
    this.promptsByGroup.set(group, arr);
    return false;
  }
}
