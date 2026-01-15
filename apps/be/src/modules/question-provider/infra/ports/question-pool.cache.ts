import { Difficulty, Domain } from '@/common/enums/learning.enum';

// Redis 접근 포트: 질문 풀 관리용 SET 조작
export interface QuestionPoolCachePort {
  getRandomId(domain: Domain, difficulty: Difficulty): Promise<number | null>;
  seedPool(domain: Domain, difficulty: Difficulty, ids: number[]): Promise<number>;
  clearAllPools(): Promise<void>;
}

export const QUESTION_POOL_CACHE = Symbol('QUESTION_POOL_CACHE');
