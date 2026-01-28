import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Category, Difficulty } from '@prisma/client';

import { EXTRA_QUESTION_REPOSITORY } from '../infra/ports/extra-question.repository.port';
import type { ExtraQuestionRepositoryPort } from '../infra/ports/extra-question.repository.port';
import { QUESTION_REPOSITORY } from '../infra/ports/question.repository';
import type { QuestionRepositoryPort } from '../infra/ports/question.repository';
import { USER_ANSWER_REPOSITORY } from '../infra/ports/user-answer.repository.port';
import type { UserAnswerRepositoryPort } from '../infra/ports/user-answer.repository.port';

/**
 * LLM 입력 및 꼬리질문 생성을 위한
 * 공통 질문 컨텍스트
 */
export interface QuestionContext {
  content: string;
  category: Category;
  difficulty: Difficulty;
  depth: number;
}

@Injectable()
export class QuestionContextResolver {
  constructor(
    // TODO: 이 부분은 AnswerRepository 구조 변경에 따라 변동가능
    @Inject(USER_ANSWER_REPOSITORY)
    private readonly answerRepository: UserAnswerRepositoryPort,

    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepositoryPort,

    @Inject(EXTRA_QUESTION_REPOSITORY)
    private readonly extraQuestionRepository: ExtraQuestionRepositoryPort,
  ) {}

  /**
   * Answer ID를 기준으로
   * - 일반 질문인지
   * - 꼬리질문인지
   * 판단하여 질문 컨텍스트를 반환한다.
   */
  async resolveByAnswerId(answerId: number): Promise<QuestionContext> {
    const answer = await this.answerRepository.findById(answerId);

    if (!answer) {
      throw new Error(`ANSWER_NOT_FOUND: answerId=${answerId}`);
    }

    /**
     * Case 1: 일반 질문에 대한 답변
     */
    if (answer.questionId !== null) {
      const question = await this.questionRepository.findById(answer.questionId);

      if (!question) {
        throw new Error(`QUESTION_NOT_FOUND: questionId=${answer.questionId}`);
      }

      return {
        content: question.content,
        category: question.domain,
        difficulty: question.difficulty,
        depth: 0,
      };
    }

    /**
     * Case 2: 꼬리질문에 대한 답변
     */
    if (answer.extraQuestionId !== null) {
      const extraQuestion = await this.extraQuestionRepository.findById(answer.extraQuestionId);

      if (!extraQuestion) {
        throw new Error(`EXTRA_QUESTION_NOT_FOUND: extraQuestionId=${answer.extraQuestionId}`);
      }

      return {
        content: extraQuestion.content,
        category: extraQuestion.category,
        difficulty: extraQuestion.difficulty,
        depth: extraQuestion.depth,
      };
    }

    /**
     * 데이터 무결성 오류
     * (questionId, extraQuestionId 둘 다 null)
     */
    throw new Error(`Invalid answer relation. answerId=${answerId} has no question reference.`);
  }
}
