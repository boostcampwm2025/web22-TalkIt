import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Difficulty, Domain } from '@/common/enums/learning.enum';
import { CreateSessionDto } from '@/learning/sessions/schemas/create-session.schema';
import { QuestionProviderService } from '@/modules/question-provider/application/question-provider.service';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

import { SessionsRepository } from '../sessions.repository';
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

    /**
     * 5. 답변 가이드 생성
     */
    const guide = this.guideBuilder.build(question.mustInclude);

    /**
     * 6. 세션 진행 + 크레딧 차감 (트랜잭션 권장)
     */
    await this.sessionsRepository.transaction(async (tx) => {
      // 질문 개수 증가
      await tx.session.update({
        where: { id: session.id },
        data: {
          currentQuestionCount: {
            increment: 1,
          },
        },
      });

      /**
       * TODO: 크레딧 차감 처리
       *
       * - UserCredit ledger에 차감 row 추가 (amount: -1)
       * - reason: 'SESSION_QUESTION'
       *
       * - 반드시 세션 진행(currentQuestionCount 증가)과
       *   동일 트랜잭션으로 처리할 것
       *
       * - 트랜잭션 내부에서:
       *   1) 현재 유저 총 크레딧 재조회 (SUM)
       *   2) 크레딧 부족 시 rollback
       *
       * - 중복 요청(빠른 연속 호출) 방어 필요
       *   - idempotency key 또는
       *   - (sessionId, questionIndex) 기준 중복 차감 방지
       */
    });

    /**
     * 7. 응답 반환
     */
    return {
      currentQuestionCount: session.currentQuestionCount + 1,
      remainedCredit: 20, //TODO 크레딧 차감, 예시 : remainedCredit - 1,
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
