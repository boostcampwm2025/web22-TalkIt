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
   * 학습 세션을 생성하고 첫 질문과 가이드를 반환한다.
   * 크레딧 확인 후 세션을 생성하며, 질문은 카테고리/난이도에 맞춰 선택된다.
   */
  async createSession(userId: number, dto: CreateSessionDto) {
    const question = await this.questionService.pickOne(dto.category, dto.difficulty);

    if (!question) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: '선택한 주제와 난이도에 해당하는 질문이 없습니다.',
      });
    }

    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);

    if (remainedCredit <= 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_CREDIT',
        message: '잔여 크레딧이 부족하여 세션을 진행할 수 없습니다.',
      });
    }

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
   * 사용자의 진행 중인(Active) 세션이 있는지 확인한다.
   */
  async getInProgressSession(userId: number) {
    const activeSession = await this.sessionsRepository.findActiveSessionByUserId(userId);

    if (!activeSession) {
      return {
        hasSession: false,
        sessionId: null,
        currentQuestionCount: null,
      };
    }

    return {
      hasSession: true,
      sessionId: activeSession.id,
      currentQuestionCount: activeSession.currentQuestionCount,
    };
  }

  /**
   * 세션 이어하기: 현재 세션 상태를 복구한다.
   * 주의: 크레딧을 차감하지 않으며, 현재 카운트에 맞는 질문을 제공한다.
   */
  async resumeSession(sessionId: number, userId: number) {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }

    if (session.completedAt || session.status === 'COMPLETED') {
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '이미 종료된 세션입니다.',
      });
    }

    if (session.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);

    // Note: DB에 '현재 진행중인 questionId'를 저장하지 않는 구조이므로,
    // 이어하기 시 '동일한 조건'의 질문을 다시 뽑아서 제공합니다.
    const question = await this.questionService.pickOne(
      session.category as Domain,
      session.difficulty as Difficulty,
    );

    if (!question) {
      // 극단적인 경우: 질문 데이터가 부족하여 못 가져올 때
      throw new NotFoundException({
        code: 'QUESTION_UNAVAILABLE',
        message: '제공할 질문을 찾을 수 없습니다.',
      });
    }

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
   * 진행 중인 세션의 다음 질문을 조회하고 카운트/크레딧을 반영한다.
   * 질문이 없으면 세션을 종료 처리하고 종료 상태를 응답한다.
   */
  async getNextQuestion(sessionId: number, userId: number) {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }

    if (session.completedAt) {
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '이미 종료된 학습 세션입니다.',
      });
    }

    if (session.userId !== userId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    const remainedCredit = await this.userCreditsRepository.getTotalCredit(userId);

    if (remainedCredit <= 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_CREDIT',
        message: '잔여 크레딧이 부족하여 더 이상 질문을 진행할 수 없습니다.',
      });
    }

    const question = await this.questionService.pickOne(
      session.category as Domain,
      session.difficulty as Difficulty,
    );

    if (!question) {
      await this.finishSession(sessionId, userId);
      throw new ConflictException({
        code: 'SESSION_COMPLETED',
        message: '더 이상 제공할 질문이 없어 세션이 종료되었습니다.',
      });
    }

    const updatedSession = await this.sessionsRepository.transaction(async (tx) => {
      return this.sessionsRepository.incrementQuestionCount(sessionId, tx);
    });

    const guide = this.guideBuilder.build(question.mustInclude);

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
   * 세션을 종료하고 점수/시간/XP/레벨/스트릭을 정산한다.
   * 답변이 없으면 즉시 종료하고, 답변이 있으면 트랜잭션으로 통계를 갱신한다.
   */
  async finishSession(sessionId: number, userId: number): Promise<FinishSessionResponseDto> {
    const { session, answers } = await this.validateAndLoadSession(sessionId, userId);

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

      const userStats = await this.userStatsRepository.findStatsByUserId(userId);
      const currentLevel = userStats?.level || 1;
      const currentTotalXp = userStats?.currentXp || 0;
      const levelInfo = await this.processLevelUp(currentLevel, currentTotalXp);

      return this.mapToFinishResponse(
        session,
        [],
        { ...levelInfo, newStreak: userStats?.streakDays || 0 },
        { baseXp: 0, difficultyBonus: null, deepDiveBonus: null },
      );
    }

    const answersForCalc = answers.map((a) => ({
      extraQuestionId: a.extraQuestionId ? String(a.extraQuestionId) : null,
    }));
    const { totalGainedXp, detail } = this.xpCalculator.calculate(
      session.difficulty as Difficulty,
      answersForCalc,
    );

    const totalScore = answers.reduce((sum, ans) => sum + (ans.overallScore || 0), 0);
    const totalTimeSec = answers.reduce((sum, ans) => sum + (ans.timeSpentSec || 0), 0);

    const result = await this.sessionsRepository.transaction(async (tx) => {
      await this.sessionsRepository.completeSession(
        sessionId,
        {
          totalScore,
          totalTimeSec,
          gainedXp: detail as unknown as Prisma.InputJsonValue,
        },
        tx,
      );

      const userStats = await this.userStatsRepository.findStatsByUserId(session.userId, tx);

      const newStreak = this.streakCalculator.calculate(
        userStats?.updatedAt,
        userStats?.streakDays || 0,
      );

      const currentLevel = userStats?.level || 1;
      const currentTotalXp = (userStats?.currentXp || 0) + totalGainedXp;

      const levelInfo = await this.processLevelUp(currentLevel, currentTotalXp);

      await this.userStatsRepository.updateStatsAtomic(
        session.userId,
        {
          newLevel: levelInfo.level,
          streakDays: newStreak,
          addedXp: totalGainedXp,
          addedSolvedCount: answers.length,
          addedStudyTime: totalTimeSec,
        },
        tx,
      );
      return { ...levelInfo, newStreak };
    });

    return this.mapToFinishResponse(session, answers, result, detail);
  }

  /**
   * 세션/답변을 조회하고 종료 가능 여부를 검증한다.
   * 세션 소유자 검증과 채점 완료 여부를 확인한다.
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
   * 누적 XP를 기준으로 레벨업과 진행도 게이지 값을 계산한다.
   * 레벨 상한을 고려해 목표 XP를 재계산하고 UI용 범위를 반환한다.
   */
  private async processLevelUp(currentLevel: number, totalXp: number) {
    let newLevel = currentLevel;

    let currentLevelReqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);

    while (totalXp >= currentLevelReqXp) {
      if (newLevel >= 100) break;
      newLevel++;
      currentLevelReqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);
    }

    const prevReqXp =
      newLevel > 1 ? await this.xpRepository.findRequiredXpByLevel(newLevel - 1) : 0;

    const reqXp = await this.xpRepository.findRequiredXpByLevel(newLevel);

    const currentLevelXp = totalXp - prevReqXp;

    return {
      level: newLevel,
      currentXp: currentLevelXp,
      prevRequiredXpForNextLevel: prevReqXp,
      requiredXpForNextLevel: reqXp,
    };
  }

  /**
   * 정산 결과를 클라이언트 응답 DTO로 변환한다.
   * 질문 목록은 일반 질문/꼬리질문을 구분해 매핑한다.
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
