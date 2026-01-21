export const QUESTION_CATEGORY = {
  OS: 'OS',
  NETWORK: 'NETWORK',
  DATABASE: 'DB',
  STRUCTURE: 'DATA_STRUCTURE',
} as const;

export type QuestionCategory = (typeof QUESTION_CATEGORY)[keyof typeof QUESTION_CATEGORY];

export const QUESTION_DIFFICULTY = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTY)[keyof typeof QUESTION_DIFFICULTY];

export const ASSESSMENT_STATUS = {
  QUEUED: 'QUEUED',
  EVALUATING: 'EVALUATING',
  FEEDBACKING: 'FEEDBACKING',
  REWARDING: 'REWARDING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUS)[keyof typeof ASSESSMENT_STATUS];
