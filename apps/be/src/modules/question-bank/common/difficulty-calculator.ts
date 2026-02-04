import { Difficulty } from './question-bank.types';

const DIFFICULTY_MATRIX = {
  1: { 1: 'EASY', 2: 'EASY', 3: 'MEDIUM' },
  2: { 1: 'EASY', 2: 'MEDIUM', 3: 'HARD' },
  3: { 1: 'MEDIUM', 2: 'HARD', 3: 'HARD' },
} as const;

export function calculateDifficulty(conceptLevel: 1 | 2 | 3, depth: 1 | 2 | 3): Difficulty {
  return DIFFICULTY_MATRIX[conceptLevel][depth];
}
