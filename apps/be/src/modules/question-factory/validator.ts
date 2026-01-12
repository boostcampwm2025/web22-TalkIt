import { Blueprint } from './types';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

const HIGH_KEYWORDS = ['왜', '근거', '설계', '선택', '트레이드오프', 'trade-off', 'tradeoff'];

export function validateBlueprint(bp: Blueprint): ValidationResult {
  const len = (bp.prompt || '').trim().length;
  if (len < 20 || len > 120) return { ok: false, reason: 'prompt_length' };

  // must_include: 3~5, no duplicates
  if (!Array.isArray(bp.must_include)) return { ok: false, reason: 'must_include_type' };
  const mi = bp.must_include.map((s) => s.trim()).filter(Boolean);
  const miSet = new Set(mi.map((s) => s.toLowerCase()));
  if (mi.length < 3 || mi.length > 5) return { ok: false, reason: 'must_include_count' };
  if (miSet.size !== mi.length) return { ok: false, reason: 'must_include_dup' };

  // common_mistakes: 1~3
  if (!Array.isArray(bp.common_mistakes)) return { ok: false, reason: 'common_mistakes_type' };
  const cm = bp.common_mistakes.map((s) => s.trim()).filter(Boolean);
  if (cm.length < 1 || cm.length > 3) return { ok: false, reason: 'common_mistakes_count' };

  const promptLower = bp.prompt.toLowerCase();
  const hasHigh = HIGH_KEYWORDS.some((k) => promptLower.includes(k.toLowerCase()));
  if (bp.question_depth === 'Low' && hasHigh)
    return { ok: false, reason: 'low_depth_invalid_keywords' };
  if (bp.question_depth === 'High' && !hasHigh)
    return { ok: false, reason: 'high_depth_missing_keywords' };

  return { ok: true };
}
