import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Difficulty, Domain } from '@/common/enums/learning.enum';
import { CreateSessionDto } from '@/learning/sessions/schemas/create-session.schema';
import { QuestionProviderService } from '@/modules/question-provider/application/question-provider.service';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

import { SessionsRepository } from '../repository/sessions.repository';
import { GuideBuilderService } from './guide-builder.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly questionService: QuestionProviderService,
    private readonly guideBuilder: GuideBuilderService,
    private readonly userCreditsRepository: UserCreditsRepository,
  ) {}

  async createSession(userId: number, dto: CreateSessionDto) {
    /**
     * 이미 진행 중인 세션 체크
     */
    // NOTE: 로그인 기능 추가하고 주석 해제
    // const activeSession = await this.sessionsRepository.findActiveSessionByUserId(userId);

    // if (activeSession) {
    //   throw new BadRequestException('이미 진행 중인 학습 세션이 있습니다.');
    // }

    /**
     * 첫 질문 조회
     */
    const question = await this.questionService.pickOne(dto.category, dto.difficulty);

    if (!question) {
      throw new BadRequestException('선택한 주제와 난이도에 해당하는 질문이 존재하지 않습니다.');
    }

    /**
     * mustInclude 키워드를 기반으로
     * 사용자에게 제공할 답변 가이드를 생성
     */
    const guide = this.guideBuilder.build(question.mustInclude);

    /**
     * 세션 생성 (Repository 타입과 정확히 일치)
     */
    const session = await this.sessionsRepository.createSession({
      userId,
      category: dto.category,
      difficulty: dto.difficulty,
    });

    return {
      sessionId: session.id,
      currentQuestionCount: 1,
      remainedCredit: 20,
      question: {
        questionId: question.questionId,
        content: question.content,
        guide,
        category: question.domain,
        difficulty: question.difficulty,
        timeLimit: question.timeLimitSec,
      },
    };
  }

  async getNextQuestion(sessionId: number) {
    /**
     * 1. 세션 조회
     */
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('학습 세션을 찾을 수 없습니다.');
    }

    /**
     * 2. 세션 상태 검증
     */

    if (session.completedAt) {
      throw new BadRequestException('이미 종료된 학습 세션입니다.');
    }

    /**
     * 3. 유저 잔여 크레딧 조회 (UserCredit ledger SUM)
     */
    /*const remainedCredit = await this.userCreditsRepository.getTotalCredit(session.userId);

    if (remainedCredit <= 0) {
      throw new BadRequestException('잔여 크레딧이 부족합니다.');
    }*/

    const question = await this.questionService.pickOne(
      session.category as Domain,
      session.difficulty as Difficulty,
    );

    if (!question) {
      /**
       * 더 이상 질문이 없다면 세션 종료 처리
       */
      /**
       * TODO: 세션 종료 처리
       *
       * - status를 COMPLETED로 변경
       * - completedAt 기록
       * - 최종 점수 / XP 계산 (향후)
       * - 세션 요약 리포트 생성 (향후)
       * - 더이상 질문이 없다는 건, 알려줘야하지 않을까?
       */
    }

    // 질문 제공 후 증가
    await this.sessionsRepository.incrementQuestionCount(sessionId);

    /**
     * 5. 답변 가이드 생성
     */
    const guide = this.guideBuilder.build(question.mustInclude);

    /**
     * 6. 응답 반환
     */
    return {
      currentQuestionCount: session.currentQuestionCount + 1,
      remainedCredit: 20,
      question: {
        questionId: question.questionId,
        content: question.content,
        guide,
        category: question.domain,
        difficulty: question.difficulty,
        timeLimit: question.timeLimitSec,
      },
    };
  }
}
