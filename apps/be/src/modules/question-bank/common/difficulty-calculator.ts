import { TotalDifficulty } from './question-bank.types';

export function calculateTotalDifficulty(
  conceptLevel: 1 | 2 | 3,
  depth: 1 | 2 | 3,
): TotalDifficulty {
  const sum = conceptLevel + depth;

  if (sum <= 3) return 'EASY';
  if (sum === 4) return 'MEDIUM';
  return 'HARD';
}
