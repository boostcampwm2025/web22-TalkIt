import { Inject, Injectable } from '@nestjs/common';

import type { ExtraQuestionModel } from '../domain/models/extra-question.model';
import {
  EXTRA_QUESTION_REPOSITORY,
  type ExtraQuestionRepositoryPort,
} from '../infra/ports/extra-question.repository.port';
import { GenerateFollowupQuestionUseCase } from './generate-followup-question.usecase';
import { QuestionContextResolver } from './question-context-resolver';

export interface CreateExtraQuestionInput {
  sessionId: number;
  parentAnswerId: number;
  answerContent: string;
}

// 꼬리질문 생성 후 시스템에 추가하는 로직

@Injectable()
export class CreateExtraQuestionUseCase {
  constructor(
    private readonly generateFollowupQuestionUseCase: GenerateFollowupQuestionUseCase,
    private readonly questionContextResolver: QuestionContextResolver,

    @Inject(EXTRA_QUESTION_REPOSITORY)
    private readonly extraQuestionRepository: ExtraQuestionRepositoryPort,
  ) {}

  async execute(input: CreateExtraQuestionInput): Promise<ExtraQuestionModel> {
    const { sessionId, parentAnswerId, answerContent } = input;

    /**
     * 중복 꼬리질문 방지
     * - “이 Answer로부터 이미 생성된 ExtraQuestion이 있는가?”
     */
    const existingExtraQuestion =
      await this.extraQuestionRepository.findByParentAnswerId(parentAnswerId);

    if (existingExtraQuestion) {
      return existingExtraQuestion;
    }

    /**
     * 부모 질문 컨텍스트 해석
     * 부모 depth 조회
     * - Normal Question → 0
     * - ExtraQuestion → parent.depth
     */
    const parentContext = await this.questionContextResolver.resolveByAnswerId(parentAnswerId);
    const parentDepth =
      await this.extraQuestionRepository.findParentDepthByAnswerId(parentAnswerId);

    const nextDepth = parentDepth + 1;

    /**
     * 꼬리질문 생성 (LLM 호출)
     * - 부모 질문 추론 x
     * - Answer 내용만 사용
     */
    const generated = await this.generateFollowupQuestionUseCase.execute({
      questionContent: parentContext.content,
      answerContent,
    });

    /**
     * 꼬리질문 저장
     */
    const extraQuestion = await this.extraQuestionRepository.save({
      sessionId,
      parentAnswerId,
      content: generated.content,
      mustInclude: generated.mustInclude,
      category: parentContext.category,
      difficulty: parentContext.difficulty,
      timeLimitSec: 180,
      depth: nextDepth,
    });

    return extraQuestion;
  }
}
