import { Domain } from '../data';

export type TotalDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DraftQuestion {
  category: Domain;
  chapter: number;
  term: string;
  difficulty: 1 | 2 | 3;
  depth: 1 | 2 | 3;
  keywords: string[];
  content: string;
}

export interface FinalQuestion {
  category: Domain;
  chapter: number;
  term: string;
  difficulty: 1 | 2 | 3;
  depth: 1 | 2 | 3;
  totalDifficulty: TotalDifficulty;
  keywords: string[];
  content: string;
  contentHash: string;
}
