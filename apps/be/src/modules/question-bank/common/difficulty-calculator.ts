import { Difficulty } from './question-bank.types';

export function calculateDifficulty(conceptLevel: 1 | 2 | 3, depth: 1 | 2 | 3): Difficulty {
  const sum = conceptLevel + depth;

  if (sum <= 3) return 'EASY';
  if (sum === 4) return 'MEDIUM';
  return 'HARD';
}
