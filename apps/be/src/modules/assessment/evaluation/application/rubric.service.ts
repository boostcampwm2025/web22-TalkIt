import { Injectable } from '@nestjs/common';

import type { Rubric } from '../dtos';
import { EvaluationRepository } from '../evaluation.repository';
import { LlmRubricProvider } from '../infra/llm-rubric.provider';

@Injectable()
export class RubricService {
  constructor(
    private readonly repo: EvaluationRepository,
    private readonly rubricProvider: LlmRubricProvider,
  ) {}
  async create(params: { questionId: number; question: string }): Promise<Rubric> {
    const { questionId, question } = params;

    // 1) 기존에 생성된 루브릭이 있는지 확인
    const existingRubric = await this.repo.getRubricByQuestionId(questionId);

    // 2) 존재하면 재생성하지 않고 반환
    if (existingRubric) {
      return { ...existingRubric } as Rubric;
    }

    // 3) Provider에서 정규화 포함 루브릭 생성
    const rubric = await this.rubricProvider.generate({ question });

    // 4) 생성된 루브릭을 DB에 저장(keywordsText에 description 저장됨)
    await this.repo.saveRubric(questionId, JSON.stringify(rubric));

    // 5) 루브릭 반환
    return rubric;
  }
}
