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
}
