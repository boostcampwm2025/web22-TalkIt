import { Injectable, Logger } from '@nestjs/common';

import type { Rubric } from '../dtos';
import { EvaluationRepository } from '../evaluation.repository';
import { LlmRubricProvider } from '../infra/llm-rubric.provider';

@Injectable()
export class RubricService {
  private readonly logger = new Logger(RubricService.name);
  constructor(
    private readonly repo: EvaluationRepository,
    private readonly rubricProvider: LlmRubricProvider,
  ) {}
  async create(answerId: number): Promise<Rubric> {
    // 답변에 연관된 문항 조회
    const context = await this.repo.findQuestionContextByAnswerId(answerId);
    if (!context) {
      this.logger.error(`QUESTION_NOT_FOUND: answerId=${answerId} relation=null`);
      throw new Error('QUESTION_NOT_FOUND');
    }

    const question = context.content;
    const questionId = context.kind === 'question' ? context.id : undefined;
    const extraQuestionId = context.kind === 'extraQuestion' ? context.id : undefined;
    this.logger.log(
      `Rubric create: answerId=${answerId} ${context.kind}Id=${context.id} questionLen=${String(question ?? '').length}`,
    );

    // 1) 기존에 생성된 루브릭이 있는지 확인
    const existingRubric = await this.repo.getRubricByTarget({ questionId, extraQuestionId });

    // 2) 존재하면 재생성하지 않고 반환
    if (existingRubric) {
      return { ...existingRubric } as Rubric;
    }

    // 3) Provider에서 정규화 포함 루브릭 생성
    const rubric = await this.rubricProvider.generate({ question });

    // 4) 생성된 루브릭을 DB에 저장(keywordsText에 description 저장됨)
    await this.repo.saveRubric({ questionId, extraQuestionId }, JSON.stringify(rubric));

    // 5) 루브릭 반환
    return rubric;
  }
}
