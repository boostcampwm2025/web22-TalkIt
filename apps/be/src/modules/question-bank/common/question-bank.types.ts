import { Domain } from '../data';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DraftQuestion {
  category: Domain;
  chapter: number;
  term: string;
  conceptLevel: 1 | 2 | 3;
  depth: 1 | 2 | 3;
  keywords: string[];
  content: string;
}

export interface FinalQuestion {
  category: Domain;
  chapter: number;
  term: string;
  conceptLevel: 1 | 2 | 3;
  depth: 1 | 2 | 3;
  difficulty: Difficulty;
  keywords: string[];
  content: string;
  contentHash: string;
}
