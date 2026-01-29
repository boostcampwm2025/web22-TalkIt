import { Injectable } from '@nestjs/common';

import { EvaluationRepository } from '../evaluation.repository';
import { LlmRubricProvider } from '../infra/llm-rubric.provider';

type Rubric = {
  items: { key: string; description: string; weight: number }[];
  scale: '0-2';
};

@Injectable()
export class RubricService {
  constructor(
    private readonly repo: EvaluationRepository,
    private readonly rubricProvider: LlmRubricProvider,
  ) {}
  async create(params: { questionId: number; questionSummary: string }): Promise<Rubric> {
    const { questionId, questionSummary } = params;

    // 1) 기존에 생성된 루브릭이 있는지 확인
    const existingRubric = await this.repo.getRubricByQuestionId(questionId);

    // 2) 없으면 LLM을 통해 루브릭 생성
    if (existingRubric) {
      // 기존 저장 포맷에는 definition이 없으므로 빈 문자열로 보정하여 반환
      return { definition: '', ...existingRubric } as Rubric;
    }

    const rubric = await this.rubricProvider.generate({ questionSummary });

    // // 3) 생성된 루브릭을 DB에 저장
    await this.repo.saveRubric(questionId, JSON.stringify(rubric));

    // 4) 루브릭 반환
    return rubric;
  }
}
