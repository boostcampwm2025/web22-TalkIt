import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

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
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }

    if (session.completedAt) {
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '이미 완료된 세션입니다.',
      });
    }

    // 크레딧 확인
    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);
    if (remainedCredit <= 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_CREDIT',
        message: '잔여 크레딧이 부족하여 더 이상 질문을 진행할 수 없습니다.',
      });
    }

    const answer = await this.answerRepository.findByIdWithContext(answerId);
    if (!answer || answer.sessionId !== sessionId) {
      throw new NotFoundException({
        code: 'ANSWER_NOT_FOUND',
        message: '답변을 찾을 수 없습니다.',
      });
    }

    // DeepDive 질문 생성
    const { extraQuestion, updatedSession } = await this.sessionsRepository.transaction(
      async (tx) => {
        const extraQuestion = await this.createExtraQuestionUseCase.execute({
          sessionId,
          parentAnswerId: answer.id,
          answerContent: answer.answerText,
        });

        const updatedSession = await this.sessionsRepository.incrementQuestionCount(sessionId, tx);

        return { extraQuestion, updatedSession };
      },
    );

    return this.present(extraQuestion, updatedSession, remainedCredit);
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
