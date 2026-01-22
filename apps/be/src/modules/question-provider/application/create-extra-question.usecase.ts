import { Inject, Injectable } from '@nestjs/common';

import { Category, Difficulty } from '@prisma/client';

import type { ExtraQuestionModel } from '../domain/models/extra-question.model';
import {
  EXTRA_QUESTION_REPOSITORY,
  type ExtraQuestionRepositoryPort,
} from '../infra/ports/extra-question.repository.port';
import { GenerateFollowupQuestionUseCase } from './generate-followup-question.usecase';

export interface CreateExtraQuestionInput {
  sessionId: number;
  parentAnswerId: number;
  answerContent: string;
  category: Category;
  difficulty: Difficulty;
}

@Injectable()
export class CreateExtraQuestionUseCase {
  constructor(
    private readonly generateFollowupQuestionUseCase: GenerateFollowupQuestionUseCase,

    @Inject(EXTRA_QUESTION_REPOSITORY)
    private readonly extraQuestionRepository: ExtraQuestionRepositoryPort,
  ) {}

  async execute(input: CreateExtraQuestionInput): Promise<ExtraQuestionModel> {
    const { sessionId, parentAnswerId, answerContent, category, difficulty } = input;

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
     * 꼬리질문 생성 (LLM 호출)
     * - 부모 질문 추론 x
     * - Answer 내용만 사용
     */
    const generated = await this.generateFollowupQuestionUseCase.execute({
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
      category,
      difficulty,
      timeLimitSec: 180,
      depth: 1,
    });

    return extraQuestion;
  }
}
