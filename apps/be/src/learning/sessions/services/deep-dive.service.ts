import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { CreateExtraQuestionUseCase } from '@/modules/question-provider/application/create-extra-question.usecase';
import { USER_ANSWER_REPOSITORY } from '@/modules/question-provider/infra/ports/user-answer.repository.port';
import type { UserAnswerRepositoryPort } from '@/modules/question-provider/infra/ports/user-answer.repository.port';

import { SessionsRepository } from '../repository/sessions.repository';
import { GuideBuilderService } from './guide-builder.service';

@Injectable()
export class DeepDiveService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly createExtraQuestionUseCase: CreateExtraQuestionUseCase,
    private readonly guideBuilder: GuideBuilderService,

    @Inject(USER_ANSWER_REPOSITORY)
    private readonly answerRepository: UserAnswerRepositoryPort,
  ) {}

  async execute(params: { userId: number; sessionId: number; answerId: number }) {
    const { userId, sessionId, answerId } = params;

    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('INVALID_SESSION');
    }

    const answer = await this.answerRepository.findById(answerId);
    if (!answer || answer.sessionId !== sessionId) {
      throw new BadRequestException('ANSWER_NOT_FOUND');
    }

    const extraQuestion = await this.createExtraQuestionUseCase.execute({
      sessionId,
      parentAnswerId: answer.id,
      answerContent: answer.answerText,
    });

    // 현재 질문 count 증가
    await this.sessionsRepository.incrementQuestionCount(sessionId);

    return this.present(extraQuestion, session, 10);
  }

  private present(extraQuestion: any, session: any, remainedCredit: number) {
    const guide = this.guideBuilder.build(extraQuestion.mustInclude);

    return {
      currentQuestionCount: session.currentQuestionCount + 1,
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
