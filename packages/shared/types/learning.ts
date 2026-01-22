import {
  type QuestionDifficulty,
  type QuestionCategory,
  type AssessmentStatus,
} from '../constants/learning';

export type Question = {
  questionId: number;
  content: string;
  guide: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  timeLimit: number; // seconds
};

// 새 학습 세션 생성 및 첫 번째 질문 조회 DTO
export type CreateQuestionResponseDTO = {
  sessionId: number;
  currentQuestionCount: number;
  remainedCredit: number;
  question: Question;
};

// 다음 질문 조회 DTO
export type GetNextQuestionResponseDTO = Pick<
  CreateQuestionResponseDTO,
  'question' | 'remainedCredit' | 'currentQuestionCount'
>;

export type SubmitRecordResponseDTO = {
  sttText: string;
};

export type QuestionArchiveItem = {
  content: string;
  type: 'NORMAL' | 'TAIL';
  score: number;
};

export type XpDetail = {
  baseXp: number;
  difficultyBonus: number | null;
  deepDiveBonus: number | null;
};

export type FinishSessionResponseDTO = {
  currentXp: number;
  prevRequiredXpForNextLevel: number;
  requiredXpForNextLevel: number;
  level: number;
  gainedXp: XpDetail;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  questions: QuestionArchiveItem[];
};

export type GetFeedbackResponseDTO = {
  answerId: number;
  question: string;
  answer: string;
  overallScore: number;
  strengths: Array<string>;
  weaknesses: Array<string>;
  suggestions: Array<string>;
  followUpQuestions: Array<string>;
  xp: number;
  remainingToken: number;
};

// 평가 요청 DTO
export type AssessRequestDTO = {
  questionId: number;
  answerText: string;
  timeSpentSec: number;
};

// 평가 응답 DTO
export type AssessResponseDTO = {
  jobId: number;
  answerId: number;
  status: AssessmentStatus;
};

// SSE 스트림 이벤트 DTO
export type AssessmentStreamEventDTO = {
  jobId: number;
  answerId: number;
  status: AssessmentStatus;
  timestamp: string;
  error: string | null;
};

// 평가 스냅샷 조회 DTO (재연결 복구용)
export type AssessmentSnapshotDTO = {
  jobId: number;
  answerId: number;
  status: AssessmentStatus;
  result: {
    score: number;
    feedback: GetFeedbackResponseDTO;
  } | null;
};
