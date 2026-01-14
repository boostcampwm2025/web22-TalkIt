import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';

// Redis 접근 포트: 질문 풀 관리용 SET 조작
export interface QuestionPoolCachePort {
  getRandomId(domain: Domain, difficulty: Difficulty): Promise<bigint | null>;
  seedPool(domain: Domain, difficulty: Difficulty, ids: bigint[]): Promise<number>;
  clearAllPools(): Promise<void>;
}

export const QUESTION_POOL_CACHE = Symbol('QUESTION_POOL_CACHE');
