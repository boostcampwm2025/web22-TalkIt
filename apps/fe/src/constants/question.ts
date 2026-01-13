import { type QuestionDifficulty, type QuestionTopic } from '@repo/shared/constants/study';

export const QUESTION_TOPIC_KR = {
  OS: '운영체제',
  NETWORK: '네트워크',
  DATABASE: '데이터베이스',
  STRUCTURE: '자료구조',
} as const satisfies Record<QuestionTopic, string>;

export const QUESTION_DIFFICULTY_KR = {
  EASY: '하급',
  MEDIUM: '중급',
  HARD: '상급',
} as const satisfies Record<QuestionDifficulty, string>;
