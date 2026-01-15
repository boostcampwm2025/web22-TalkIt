import { type QuestionDifficulty, type QuestionTopic } from '../constants/learning';

export type Question = {
  questionId: number;
  content: string;
  guide: Array<string>;
  topic: QuestionTopic;
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
