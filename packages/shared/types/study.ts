import { type QuestionDifficulty, type QuestionTopic } from '../constants/study';

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
  question: Question;
};
