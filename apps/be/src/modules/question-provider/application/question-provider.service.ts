import { Inject, Injectable } from '@nestjs/common';

import { PickOptions } from '../domain/strategy/question-pick-strategy';
import { QUESTION_PICK_STRATEGY } from '../domain/strategy/question-pick-strategy';
import type { QuestionPickStrategy } from '../domain/strategy/question-pick-strategy';
import { QUESTION_REPOSITORY } from '../infra/ports/question.repository';
import type { QuestionRepositoryPort } from '../infra/ports/question.repository';
import { Difficulty, Domain } from '../presentation/dto/pick-question.request.dto';

// 핵심 서비스: 전략을 통해 ID 선택 → DB 조회 → DTO로 반환하는 응집 로직
@Injectable()
export class QuestionProviderService {
  constructor(
    @Inject(QUESTION_PICK_STRATEGY) private readonly picker: QuestionPickStrategy,
    @Inject(QUESTION_REPOSITORY) private readonly repo: QuestionRepositoryPort,
  ) {}

  // 기본 전략은 RandomPickStrategy이지만, 현재는 pool에서 바로 뽑음
  async pickOne(domain: Domain, difficulty: Difficulty, _options?: PickOptions) {
    const id = await this.picker.pick(domain, difficulty, _options);
    if (!id) {
      // 운영 정책: 503 혹은 명시 에러 메시지
      throw new Error('Question pool not warmed; run warm-up');
    }
    const q = await this.repo.findById(id);
    if (!q) {
      throw new Error(`Question not found for id=${id.toString()}`);
    }
    return {
      questionId: q.id.toString(),
      domain: q.domain,
      difficulty: q.difficulty,
      topicId: q.topicId,
      content: q.content,
      mustInclude: q.mustInclude,
      timeLimitSec: q.timeLimitSec,
    } as const;
  }
}
