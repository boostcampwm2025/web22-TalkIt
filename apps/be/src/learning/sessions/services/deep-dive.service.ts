import { BadRequestException, Injectable } from '@nestjs/common';

import { CreateExtraQuestionUseCase } from '@/modules/question-provider/application/create-extra-question.usecase';

import { AnswerRepository } from '../repository/answer.repository';
import { SessionsRepository } from '../repository/sessions.repository';
import { GuideBuilderService } from './guide-builder.service';

@Injectable()
export class DeepDiveService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly createExtraQuestionUseCase: CreateExtraQuestionUseCase,
    private readonly guideBuilder: GuideBuilderService,
  ) {}

  async execute(params: { userId: number; sessionId: number; answerId: number }) {
    const { userId, sessionId, answerId } = params;

    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('INVALID_SESSION');
    }

    const answer = await this.answerRepository.findByIdWithContext(answerId);
    if (!answer || answer.sessionId !== sessionId) {
      throw new BadRequestException('ANSWER_NOT_FOUND');
    }

    const extraQuestion = await this.createExtraQuestionUseCase.execute({
      sessionId,
      parentAnswerId: answer.id,
      answerContent: answer.answerText,
      category: answer.category,
      difficulty: answer.difficulty,
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
        questionId: extraQuestion.id,
        type: 'EXTRA_QUESTION',
        content: extraQuestion.content,
        guide,
        category: extraQuestion.category,
        difficulty: extraQuestion.difficulty,
        timeLimit: extraQuestion.timeLimitSec,
      },
    };
  }
}
