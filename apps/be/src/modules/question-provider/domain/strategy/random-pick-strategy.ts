import { Inject, Injectable } from '@nestjs/common';

import { QUESTION_POOL_CACHE } from '../../infra/ports/question-pool.cache';
import type { QuestionPoolCachePort } from '../../infra/ports/question-pool.cache';
import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';
import { PickOptions, QuestionPickStrategy } from './question-pick-strategy';

// 무작위 선택 전략: Redis SET에서 SRANDMEMBER 1개를 가져오는 기본 전략
@Injectable()
export class RandomPickStrategy implements QuestionPickStrategy {
  constructor(@Inject(QUESTION_POOL_CACHE) private readonly pool: QuestionPoolCachePort) {}

  async pick(domain: Domain, difficulty: Difficulty, _options?: PickOptions): Promise<bigint> {
    const id = await this.pool.getRandomId(domain, difficulty);
    if (!id) {
      throw new Error('Question pool not warmed; run warm-up');
    }
    return id;
  }
}
