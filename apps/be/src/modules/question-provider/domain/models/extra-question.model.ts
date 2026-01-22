import { Category, Difficulty } from '@prisma/client';

export interface ExtraQuestionModel {
  id: number;
  sessionId: number;
  parentAnswerId: number;
  content: string;
  mustInclude: string[];
  category: Category;
  difficulty: Difficulty;
  timeLimitSec: number;
  depth: number;
  createdAt: Date;
}
