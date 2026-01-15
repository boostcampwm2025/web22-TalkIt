import { BadRequestException, Injectable } from '@nestjs/common';

import { CreateSessionDto } from '@/learning/sessions/schemas/create-session.schema';

import { SessionsRepository } from '../sessions.repository';
import { QuestionMockService } from './question-mock.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly questionService: QuestionMockService,
  ) {}

  async createSession(userId: number, dto: CreateSessionDto) {
    /**
     * 이미 진행 중인 세션 체크
     */
    const activeSession = await this.sessionsRepository.findActiveSessionByUserId(userId);

    if (activeSession) {
      throw new BadRequestException('이미 진행 중인 학습 세션이 있습니다.');
    }

    /**
     * 첫 질문 조회 (mock)
     */
    const question = await this.questionService.getFirstQuestion(dto.category, dto.difficulty);

    if (!question) {
      throw new BadRequestException('선택한 주제와 난이도에 해당하는 질문이 존재하지 않습니다.');
    }

    /**
     * 세션 생성 (Repository 타입과 정확히 일치)
     */
    const session = await this.sessionsRepository.createSession({
      userId,
      category: dto.category,
      difficulty: dto.difficulty,
    });

    /**
     * 응답 (bigint → string/number 변환)
     */
    return {
      sessionId: session.id,
      currentQuestionCount: 1,
      remainedCredit: 20,
      question: {
        questionId: question.questionId.toString(),
        content: question.content,
        guide: question.guide,
        category: question.category,
        difficulty: question.difficulty,
        timeLimit: question.timeLimit,
      },
    };
  }
}
