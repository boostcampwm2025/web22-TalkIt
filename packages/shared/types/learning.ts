import { type QuestionDifficulty, type QuestionCategory } from '../constants/learning';

export type Question = {
  questionId: number;
  content: string;
  guide: Array<string>;
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
