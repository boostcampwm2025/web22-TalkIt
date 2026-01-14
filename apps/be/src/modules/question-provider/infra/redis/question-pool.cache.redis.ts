import { Inject, Injectable } from '@nestjs/common';

import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';
import { QuestionPoolCachePort } from '../ports/question-pool.cache';
import { REDIS_CLIENT } from './redis.provider';

// Redis 기반 질문 풀 캐시 구현체
@Injectable()
export class QuestionPoolCacheRedis implements QuestionPoolCachePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {}

  private key(domain: Domain, difficulty: Difficulty) {
    return `qpool:${domain}:${difficulty}`;
  }

  async getRandomId(domain: Domain, difficulty: Difficulty): Promise<bigint | null> {
    const key = this.key(domain, difficulty);
    // 호환 처리: ioredis는 `srandmember`, node-redis v4는 `sRandMember`
    let idStr: string | null = null;
    if (typeof this.redis?.srandmember === 'function') {
      idStr = await this.redis.srandmember(key);
    } else if (typeof this.redis?.sRandMember === 'function') {
      const out = await this.redis.sRandMember(key);
      idStr = (Array.isArray(out) ? out[0] : out) ?? null;
    }
    if (!idStr) return null;
    try {
      return BigInt(idStr);
    } catch {
      return null;
    }
  }

  async seedPool(domain: Domain, difficulty: Difficulty, ids: bigint[]): Promise<number> {
    const key = this.key(domain, difficulty);
    if (!ids.length) return 0;
    const members = ids.map((b) => b.toString());
    // 대량 SADD; 환경에 따라 파이프라이닝 고려 가능
    if (typeof this.redis?.sadd === 'function') {
      const added = await this.redis.sadd(key, members);
      return Number(added ?? 0);
    }
    if (typeof this.redis?.sAdd === 'function') {
      const added = await this.redis.sAdd(key, members);
      return Number(added ?? 0);
    }
    throw new Error('Redis client has no SADD/sAdd method');
  }

  async clearAllPools(): Promise<void> {
    // 간단 구현: 패턴 기반 삭제는 SCAN 필요. 여기서는 키가 제한적이므로 명시 조합 삭제 권장.
    // 운영 환경에서는 별도 관리 또는 SCAN 기반 삭제 구현 필요
    // 노이즈를 줄이기 위해 noop 처리 (스크립트에서 명시 삭제 구현)
  }
}
