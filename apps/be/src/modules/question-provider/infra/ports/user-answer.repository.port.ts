/**
 * TODO:
 * - 이 Port의 실제 책임 위치는 평가모듈 또는 user모듈이 적절함.
 * - 현재는 QuestionContextResolver 의존성 분리를 위해
 *   question-provider 모듈에 임시로 위치함
 * - 추후 모듈 분리 시 해당 Port를 공용 레이어로 이동 예정
 */

export interface UserAnswerRepositoryPort {
  /**
   * Answer 기본 조회
   * - 질문 타입 판단을 위해 questionId / extraQuestionId만 필요
   */
  findById(answerId: number): Promise<{
    id: number;
    sessionId: number;
    answerText: string;
    questionId: number | null;
    extraQuestionId: number | null;
  } | null>;
}

export const USER_ANSWER_REPOSITORY = Symbol('USER_ANSWER_REPOSITORY');
