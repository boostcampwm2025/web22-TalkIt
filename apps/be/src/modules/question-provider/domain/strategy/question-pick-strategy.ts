import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';

// PickOptions: 확장 포인트 (세션/유저 이력은 지금 미구현)
export interface PickOptions {
  excludeQuestionIds?: bigint[];
  userId?: string;
  sessionId?: string;
  strategy?: 'random' | 'avoid_seen';
}

// 전략 패턴 인터페이스: 전략마다 질문 ID 선택 방법을 바꿀 수 있음
export interface QuestionPickStrategy {
  pick(domain: Domain, difficulty: Difficulty, options?: PickOptions): Promise<bigint>;
}

// DI 토큰
export const QUESTION_PICK_STRATEGY = Symbol('QUESTION_PICK_STRATEGY');
