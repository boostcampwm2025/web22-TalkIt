import { Injectable } from '@nestjs/common';

import type { UserAnswerRepositoryPort } from '../ports/user-answer.repository.port';
import { PrismaService } from './prisma.service';

/**
 * UserAnswerRepositoryPrisma
 *
 * TODO:
 * - 이 구현체는 현재 QuestionProviderModule 의존성 해소를 위한 임시 구현이다.
 * - UserAnswer 도메인의 실제 책임 위치는 평가모듈 또는 user모듈이 적절함
 * - 추후 해당 모듈로 이동하고, Port 또한 공용 레이어로 분리할 예정이다.
 */
@Injectable()
export class UserAnswerRepositoryPrisma implements UserAnswerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Answer 기본 조회
   * - QuestionContextResolver에서 질문 타입 판단 용도로 사용
   */
  async findById(answerId: number) {
    return this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        sessionId: true,
        answerText: true,
        questionId: true,
        extraQuestionId: true,
      },
    });
  }

  async findByIdWithContext(answerId: number) {
    /**
     * Answer 단건 조회
     * - question / extraQuestion을 함께 include하여
     *   Answer가 어떤 질문 컨텍스트에서 생성되었는지 판단한다.
     */
    const answer = await this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        extraQuestion: true,
      },
    });

    /**
     * Answer가 존재하지 않는 경우
     */
    if (!answer) return null;

    /**
     * Answer의 질문 컨텍스트로부터 category / difficulty 추출
     *
     * - 일반 Question에 대한 답변인 경우: answer.question 기준
     * - ExtraQuestion(꼬리질문)에 대한 답변인 경우: answer.extraQuestion 기준
     *
     * 두 경우 모두 동일한 Context(category, difficulty)를
     * 상위 로직에서 일관되게 사용할 수 있도록 여기서 정규화한다.
     */
    const category = answer.question?.category ?? answer.extraQuestion?.category;

    const difficulty = answer.question?.difficulty ?? answer.extraQuestion?.difficulty;

    const depth = answer.extraQuestion ? answer.extraQuestion.depth : 0;

    /**
     * 정상적인 Answer라면 반드시 하나의 질문 컨텍스트를 가져야 한다.
     * category / difficulty를 추출할 수 없는 경우는
     * 데이터 정합성이 깨진 상태로 판단하여 예외 처리한다.
     */
    if (!category || !difficulty) {
      throw new Error('ANSWER_CONTEXT_NOT_FOUND');
    }

    /**
     * Answer + 해석된 질문 컨텍스트 반환
     *
     * - question / extraQuestion raw entity는 노출하지 않고
     * - 상위 레이어에서는 Context 정보만 사용하도록 제한한다.
     */
    return {
      id: answer.id,
      sessionId: answer.sessionId,
      answerText: answer.answerText,
      questionId: answer.questionId,
      extraQuestionId: answer.extraQuestionId,
      category,
      difficulty,
      depth,
    };
  }
}
