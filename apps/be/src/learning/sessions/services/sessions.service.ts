import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Difficulty, Domain } from '@/common/enums/learning.enum';
import { PrismaService } from '@/infra/database/prisma.service';
import { CreateSessionDto } from '@/learning/sessions/schemas/create-session.schema';
import { XpRepository } from '@/learning/xp/repository/xp.repository';
import { QuestionProviderService } from '@/modules/question-provider/application/question-provider.service';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { UserStatsRepository } from '@/users/stats/repository/user-stats.repository';
import { StreakCalculatorService } from '@/users/stats/services/streak-calculator.service';
import { XpCalculatorService } from '@/users/stats/services/xp-calculator.service';
import { Prisma } from '@prisma/client';

import { SessionsRepository } from '../repository/sessions.repository';
import { FinishSessionResponseDto, GainedXpDetailDto } from '../schemas/finish-session.schema';
import { GuideBuilderService } from './guide-builder.service';

type TransactionResult = {
  currentXp: number;
  level: number;
  prevRequiredXpForNextLevel: number;
  requiredXpForNextLevel: number;
  newStreak: number;
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly questionService: QuestionProviderService,
    private readonly guideBuilder: GuideBuilderService,
    private readonly userCreditsRepository: UserCreditsRepository,
    private readonly userStatsRepository: UserStatsRepository,
    private readonly xpRepository: XpRepository,
    private readonly prisma: PrismaService,
    private readonly xpCalculator: XpCalculatorService,
    private readonly streakCalculator: StreakCalculatorService,
  ) {}

  /**
   * 세션 생성 + 첫 질문 제공
   *
   * 규칙:
   * - 세션 생성과 첫 질문 비용 차감은 하나의 트랜잭션
   * - createSession 시점에 currentQuestionCount = 1
   */

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
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: '선택한 주제와 난이도에 해당하는 질문이 없습니다.',
      });
    }

    /**
     * 유저의 잔여 크레딧 조회
     */

    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);

    /**
     * 세션 생성 + 첫 질문 비용 차감 (원자적 처리)
     */
    const session = await this.sessionsRepository.transaction(async (tx) => {
      const createdSession = await this.sessionsRepository.createSession(
        {
          userId,
          category: dto.category,
          difficulty: dto.difficulty,
        },
        tx,
      );

      return createdSession;
    });

    /**
     * mustInclude 키워드를 기반으로
     * 사용자에게 제공할 답변 가이드를 생성
     */
    const guide = this.guideBuilder.build(question.mustInclude);

    return {
      sessionId: session.id,
      currentQuestionCount: session.currentQuestionCount,
      remainedCredit: remainedCredit,
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

  /**
   * 다음 질문 조회
   *
   * 규칙:
   * - 질문 제공 시점에 크레딧 차감 + questionCount 증가
   * - 종료 조건 감지만 담당 (종료 처리는 finishSession에 위임)
   */

  async getNextQuestion(sessionId: number, userId: number) {
    /**
     * 1. 세션 조회
     */
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }

    /**
     * 2. 세션 상태 검증
     */

    if (session.completedAt) {
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '이미 종료된 학습 세션입니다.',
      });
    }

    if (session.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    /**
     * 3. 유저 잔여 크레딧 조회 (UserCredit ledger SUM)
     */
    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);

    const question = await this.questionService.pickOne(
      session.category as Domain,
      session.difficulty as Difficulty,
    );

    if (!question) {
      /**
       * 더 이상 질문이 없다면 세션 종료 처리
       */

      await this.finishSession(sessionId, userId);
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '더 이상 제공할 질문이 없어 세션이 종료되었습니다.',
      });
    }

    // 질문 제공 후 증가
    const updatedSession = await this.sessionsRepository.transaction(async (tx) => {
      return this.sessionsRepository.incrementQuestionCount(sessionId, tx);
    });
    /**
     * 5. 답변 가이드 생성
     */
    const guide = this.guideBuilder.build(question.mustInclude);

    /**
     * 6. 응답 반환
     */
    return {
      currentQuestionCount: updatedSession.currentQuestionCount,
      remainedCredit: remainedCredit,
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

  /**
   * 세션 종료 및 리워드(XP, 레벨, 스트릭) 정산을 수행하는 메인 메서드
   * - 세션 종료는 반드시 이 메서드를 통해서만 수행
   */
  async finishSession(sessionId: number, userId: number): Promise<FinishSessionResponseDto> {
    // 1. 검증 및 데이터 로드
    const { session, answers } = await this.validateAndLoadSession(sessionId, userId);

    // ✅ 중도 포기 처리 (답변 0개)
    if (answers.length === 0) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalScore: 0,
          totalTimeSec: 0,
          gainedXp: { baseXp: 0, difficultyBonus: null, deepDiveBonus: null } as any,
        },
      });

      // 유저의 기존 스탯 정보를 가져옴 (경험치 변화 없음)
      const userStats = await this.userStatsRepository.findStatsByUserId(userId);
      const currentLevel = userStats?.level || 1;
      const currentTotalXp = userStats?.currentXp || 0;

      // 현재 레벨의 게이지 정보만 계산해서 반환
      const levelInfo = await this.processLevelUp(currentLevel, currentTotalXp);

      return this.mapToFinishResponse(
        session,
        [],
        { ...levelInfo, newStreak: userStats?.streakDays || 0 },
        { baseXp: 0, difficultyBonus: null, deepDiveBonus: null },
      );
    }

    // 2. XP 계산 위임
    const answersForCalc = answers.map((a) => ({
      extraQuestionId: a.extraQuestionId ? String(a.extraQuestionId) : null,
    }));
    const { totalGainedXp, detail } = this.xpCalculator.calculate(
      session.difficulty as Difficulty,
      answersForCalc,
    );

    // 3. 통계 데이터 집계
    const totalScore = answers.reduce((sum, ans) => sum + (ans.overallScore || 0), 0);
    const totalTimeSec = answers.reduce((sum, ans) => sum + (ans.timeSpentSec || 0), 0);

    // 4. DB 트랜잭션 실행
    const result = await this.prisma.$transaction(async (tx) => {
      // 4-1. 세션 종료
      await tx.session.update({
        where: { id: sessionId, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalScore,
          totalTimeSec,
          gainedXp: detail as unknown as Prisma.InputJsonValue,
        },
      });

      // 4-2. 유저 스탯 조회
      const userStats = await this.userStatsRepository.findStatsByUserId(session.userId, tx);

      // 4-3. 스트릭 계산 위임
      const newStreak = this.streakCalculator.calculate(
        userStats?.updatedAt,
        userStats?.streakDays || 0,
      );

      // 4-4. 누적 데이터 계산
      const currentLevel = userStats?.level || 1;
      const currentTotalXp = (userStats?.currentXp || 0) + totalGainedXp;

      // 4-5. 레벨업 처리
      const levelInfo = await this.processLevelUp(currentLevel, currentTotalXp);

      // 4-6. 유저 스탯 저장
      await this.userStatsRepository.upsertStats(
        session.userId,
        {
          level: levelInfo.level,
          currentXp: currentTotalXp, // 누적된 총 XP
          totalSolvedQuestions: (userStats?.totalSolvedQuestions || 0) + answers.length,
          streakDays: newStreak,
          totalStudyTimeSec: (userStats?.totalStudyTimeSec || 0) + totalTimeSec,
        },
        tx,
      );
      return { ...levelInfo, newStreak };
    });

    // 5. 응답 매핑
    return this.mapToFinishResponse(session, answers, result, detail);
  }

  /**
   * 세션 및 답변 데이터를 조회하고, 종료 가능 여부를 검증하는 메서드
   */
  private async validateAndLoadSession(sessionId: number, userId: number) {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) throw new NotFoundException('세션을 찾을 수 없습니다.');
    if (session.status === 'COMPLETED') throw new BadRequestException('이미 종료된 세션입니다.');

    if (session.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    const answers = await this.prisma.userAnswer.findMany({
      where: { sessionId },
      include: { question: true, extraQuestion: true },
    });

    if (answers.some((ans) => ans.overallScore === null)) {
      throw new BadRequestException({
        code: 'ASSESSMENT_PENDING',
        message: '아직 AI 채점이 진행 중인 답변이 있습니다.',
      });
    }

    return { session, answers };
  }

  /**
   * 누적 경험치를 기반으로 레벨업을 처리하고, UI 표시용 게이지 정보를 계산하는 메서드
   */
  private async processLevelUp(currentLevel: number, totalXp: number) {
    let newLevel = currentLevel;

    // 현재 레벨의 졸업 요건 조회
    let currentLevelReqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);

    // 레벨업 루프
    while (totalXp >= currentLevelReqXp) {
      if (newLevel >= 100) break;
      newLevel++;
      currentLevelReqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);
    }

    // UI 범위 계산
    // prevReqXp: 이전 레벨까지 필요했던 총 경험치 (이번 레벨의 바닥)
    // reqXp: 다음 레벨까지 필요한 총 경험치 (이번 레벨의 천장)

    // Level 1이면 바닥은 0, Level 2이상이면 (Level-1)의 요구량
    const prevReqXp =
      newLevel > 1 ? await this.xpRepository.findRequiredXpByLevel(newLevel - 1) : 0;

    const reqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);

    // 현재 레벨에서의 진행도 (Relative XP) 계산
    const currentLevelXp = totalXp - prevReqXp;

    return {
      level: newLevel,
      currentXp: currentLevelXp, // UI에는 초기화된 값 전달
      prevRequiredXpForNextLevel: prevReqXp,
      requiredXpForNextLevel: reqXp,
    };
  }

  /**
   * 처리된 결과를 클라이언트 응답 DTO 형식으로 매핑하는 메서드
   */
  private mapToFinishResponse(
    session: any,
    answers: any[],
    result: TransactionResult,
    gainedXp: GainedXpDetailDto,
  ): FinishSessionResponseDto {
    return {
      currentXp: result.currentXp,
      prevRequiredXpForNextLevel: result.prevRequiredXpForNextLevel,
      requiredXpForNextLevel: result.requiredXpForNextLevel,
      level: result.level,
      gainedXp,
      category: session.category as unknown as Domain,
      difficulty: session.difficulty as unknown as Difficulty,
      questions: answers.map((ans) => {
        const isTail = !!ans.extraQuestionId;
        return {
          content: isTail
            ? (ans.extraQuestion?.content ?? '내용 없음')
            : (ans.question?.content ?? '내용 없음'),
          type: isTail ? 'TAIL' : 'NORMAL',
          score: ans.overallScore || 0,
        };
      }),
    };
  }
}
