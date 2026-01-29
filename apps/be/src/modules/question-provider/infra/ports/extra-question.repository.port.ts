import { Category, Difficulty } from '@prisma/client';

import type { ExtraQuestionModel } from '../../domain/models/extra-question.model';

export interface ParentDepthContext {
  parentDepth: number; // Question이면 0, ExtraQuestion이면 해당 depth
}

export interface ExtraQuestionRepositoryPort {
  /**
   * ExtraQuestion 단건 조회
   */
  findById(id: number): Promise<ExtraQuestionModel | null>;

  /**
   * 특정 Answer로부터 생성된 꼬리질문 조회
   * (중복 생성 방지용)
   */
  findByParentAnswerId(parentAnswerId: number): Promise<ExtraQuestionModel | null>;

  /**
   * 부모 Answer의 질문 depth 조회
   * - Normal Question → 0
   * - ExtraQuestion → 해당 depth
   */
  findParentDepthByAnswerId(parentAnswerId: number): Promise<number>;

  /**
   * ExtraQuestion 저장
   */
  save(data: {
    sessionId: number;
    parentAnswerId: number;
    content: string;
    mustInclude: string[];
    category: Category;
    difficulty: Difficulty;
    timeLimitSec: number;
    depth: number;
  }): Promise<ExtraQuestionModel>;
}

export const EXTRA_QUESTION_REPOSITORY = Symbol('EXTRA_QUESTION_REPOSITORY');
