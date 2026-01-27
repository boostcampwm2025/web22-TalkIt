import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { CreateExtraQuestionUseCase } from '@/modules/question-provider/application/create-extra-question.usecase';
import { USER_ANSWER_REPOSITORY } from '@/modules/question-provider/infra/ports/user-answer.repository.port';
import type { UserAnswerRepositoryPort } from '@/modules/question-provider/infra/ports/user-answer.repository.port';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

import { SessionsRepository } from '../repository/sessions.repository';
import { GuideBuilderService } from './guide-builder.service';
import { SessionsService } from './sessions.service';

@Injectable()
export class DeepDiveService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly createExtraQuestionUseCase: CreateExtraQuestionUseCase,
    private readonly guideBuilder: GuideBuilderService,

    @Inject(USER_ANSWER_REPOSITORY)
    private readonly answerRepository: UserAnswerRepositoryPort,
    private readonly sessionsService: SessionsService,
    private readonly userCreditsRepository: UserCreditsRepository,
  ) {}

  async execute(params: { userId: number; sessionId: number; answerId: number }) {
    const { userId, sessionId, answerId } = params;

    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('INVALID_SESSION');
    }

    if (session.completedAt) {
      throw new BadRequestException('SESSION_COMPLETED');
    }

    // 크레딧 확인
    // NOTE: 테스트를 위해서 일단 주석처리했습니다. 실 사용시 주석 해제하면 됩니다.
    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);
    if (remainedCredit <= 0) {
      /*await this.sessionsService.finishSession(sessionId);
      throw new BadRequestException({
        code: 'CREDIT_EXHAUSTED',
        message: '잔여 크레딧이 부족합니다.',
      });*/
    }

    const answer = await this.answerRepository.findByIdWithContext(answerId);
    if (!answer || answer.sessionId !== sessionId) {
      throw new BadRequestException('ANSWER_NOT_FOUND');
    }

    // DeepDive 질문 생성 + 상태 변경 (트랜잭션)
    const { extraQuestion, updatedSession } = await this.sessionsRepository.transaction(
      async (tx) => {
        const extraQuestion = await this.createExtraQuestionUseCase.execute({
          sessionId,
          parentAnswerId: answer.id,
          answerContent: answer.answerText,
        });

        await this.userCreditsRepository.consume(
          userId,
          'EXTRA_QUESTION_CONSUME', // TODO: Credit Reason은 Enum으로 정의하는거 고려
          1,
          tx,
        );

        const updatedSession = await this.sessionsRepository.incrementQuestionCount(sessionId, tx);

        return { extraQuestion, updatedSession };
      },
    );

    return this.present(extraQuestion, updatedSession, remainedCredit - 1);
  }

  private present(extraQuestion: any, session: any, remainedCredit: number) {
    const guide = this.guideBuilder.build(extraQuestion.mustInclude);

    return {
      currentQuestionCount: session.currentQuestionCount,
      remainedCredit,
      question: {
        extraQuestionId: extraQuestion.id,
        content: extraQuestion.content,
        guide,
        category: extraQuestion.category,
        difficulty: extraQuestion.difficulty,
        timeLimit: extraQuestion.timeLimitSec,
      },
    };
  }
}
