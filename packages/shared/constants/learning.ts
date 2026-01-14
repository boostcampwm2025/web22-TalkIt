export const QUESTION_TOPIC = {
  OS: 'OS',
  NETWORK: 'NETWORK',
  DATABASE: 'DATABASE',
  STRUCTURE: 'STRUCTURE',
} as const;

export type QuestionTopic = (typeof QUESTION_TOPIC)[keyof typeof QUESTION_TOPIC];

export const QUESTION_DIFFICULTY = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTY)[keyof typeof QUESTION_DIFFICULTY];
