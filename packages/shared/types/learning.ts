import { type QuestionDifficulty, type QuestionCategory } from '../constants/learning';

export type Question = {
  questionId: number;
  content: string;
  guide: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  timeLimit: number; // seconds
};

export type CreateQuestionResponseDTO = {
  sessionId: number;
  currentQuestionCount: number;
  remainedCredit: number;
  question: Question;
};

export type SubmitRecordResponseDTO = {
  sttText: string;
};

export type FinishSessionResponseDTO = {
  currentXp: number;
  prevRequiredXpForNextLevel: number;
  requiredXpForNextLevel: number;
  level: number;
  gainedXp: {
    baseXp: number;
    difficultyBonus: number | null;
    deepDiveBonus: number | null;
  };
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  questions: {
    content: string;
    type: 'NORMAL' | 'TAIL';
    score: number;
  }[];
};
