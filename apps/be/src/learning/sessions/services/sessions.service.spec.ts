import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const makeService = () => {
    const sessionsRepository = {
      findById: jest.fn(),
      transaction: jest.fn(async (fn: any) => fn({})),
      createSession: jest.fn(),
      incrementQuestionCount: jest.fn(),
      completeSession: jest.fn(),
    };
    const questionService = {
      pickOne: jest.fn(),
    };
    const guideBuilder = {
      build: jest.fn().mockReturnValue(['guide-1']),
    };
    const userCreditsRepository = {
      getTotalCredit: jest.fn(),
    };
    const userStatsRepository = {
      findStatsByUserId: jest.fn(),
      updateStatsAtomic: jest.fn(),
    };
    const xpRepository = {
      findRequiredXpByLevel: jest.fn(),
    };
    const prisma = {
      userAnswer: { findMany: jest.fn() },
      session: { update: jest.fn() },
    };
    const xpCalculator = {
      calculate: jest.fn(),
    };
    const streakCalculator = {
      calculate: jest.fn(),
    };

    const service = new SessionsService(
      sessionsRepository as any,
      questionService as any,
      guideBuilder as any,
      userCreditsRepository as any,
      userStatsRepository as any,
      xpRepository as any,
      prisma as any,
      xpCalculator as any,
      streakCalculator as any,
    );

    return {
      service,
      sessionsRepository,
      questionService,
      guideBuilder,
      userCreditsRepository,
      userStatsRepository,
      xpRepository,
      prisma,
      xpCalculator,
      streakCalculator,
    };
  };

  it('세션 생성 시 정상적으로 세션 ID가 발급된다', async () => {
    const { service, sessionsRepository, questionService, userCreditsRepository } = makeService();

    sessionsRepository.createSession.mockResolvedValue({ id: 10, currentQuestionCount: 1 });
    questionService.pickOne.mockResolvedValue({
      questionId: 99,
      content: 'Q',
      mustInclude: ['a'],
      domain: 'OS',
      difficulty: 'EASY',
      timeLimitSec: 100,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(5);

    const result = await service.createSession(1, { category: 'OS', difficulty: 'EASY' } as any);

    expect(result.sessionId).toBe(10);
    expect(result.question.questionId).toBe(99);
  });

  it('크레딧이 0 이하이면 세션 생성에서 충돌 예외를 반환한다', async () => {
    const { service, questionService, userCreditsRepository } = makeService();

    questionService.pickOne.mockResolvedValue({
      questionId: 99,
      content: 'Q',
      mustInclude: ['a'],
      domain: 'OS',
      difficulty: 'EASY',
      timeLimitSec: 100,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(0);

    await expect(
      service.createSession(1, { category: 'OS', difficulty: 'EASY' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('동일 사용자 요청 시 세션이 유지된다(진행 중 세션에서 다음 질문 조회)', async () => {
    const { service, sessionsRepository, questionService, userCreditsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 10,
      userId: 1,
      status: 'ACTIVE',
      category: 'OS',
      difficulty: 'EASY',
      currentQuestionCount: 1,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(5);
    questionService.pickOne.mockResolvedValue({
      questionId: 100,
      content: 'Q2',
      mustInclude: ['b'],
      domain: 'OS',
      difficulty: 'EASY',
      timeLimitSec: 100,
    });
    sessionsRepository.incrementQuestionCount.mockResolvedValue({
      currentQuestionCount: 2,
    });

    const result = await service.getNextQuestion(10, 1);

    expect(result.currentQuestionCount).toBe(2);
    expect(sessionsRepository.incrementQuestionCount).toHaveBeenCalledWith(10, expect.anything());
  });

  it('세션에 저장된 학습 상태가 정상적으로 조회된다', async () => {
    const { service, sessionsRepository, questionService, userCreditsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 11,
      userId: 1,
      status: 'ACTIVE',
      category: 'OS',
      difficulty: 'MEDIUM',
      currentQuestionCount: 3,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(7);
    questionService.pickOne.mockResolvedValue({
      questionId: 101,
      content: 'Q3',
      mustInclude: ['c'],
      domain: 'OS',
      difficulty: 'MEDIUM',
      timeLimitSec: 200,
    });
    sessionsRepository.incrementQuestionCount.mockResolvedValue({
      currentQuestionCount: 4,
    });

    const result = await service.getNextQuestion(11, 1);

    expect(result.currentQuestionCount).toBe(4);
    expect(result.question.questionId).toBe(101);
    expect(result.remainedCredit).toBe(7);
  });

  it('크레딧이 0 이하이면 다음 질문 제공에서 충돌 예외를 반환한다', async () => {
    const { service, sessionsRepository, userCreditsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 11,
      userId: 1,
      status: 'ACTIVE',
      category: 'OS',
      difficulty: 'EASY',
      currentQuestionCount: 1,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(0);

    await expect(service.getNextQuestion(11, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('세션이 없는 요청에 대해 예외 처리가 올바르게 동작한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue(null);

    await expect(service.getNextQuestion(999, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('세션이 완료 상태면 getNextQuestion에서 충돌 예외를 반환한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 20,
      userId: 1,
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    await expect(service.getNextQuestion(20, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('질문이 더 이상 없으면 세션 종료 후 충돌 예외를 반환한다', async () => {
    const { service, sessionsRepository, questionService } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 21,
      userId: 1,
      status: 'ACTIVE',
      category: 'OS',
      difficulty: 'EASY',
      currentQuestionCount: 1,
      completedAt: null,
    });
    questionService.pickOne.mockResolvedValue(null);
    sessionsRepository.transaction.mockResolvedValue({ id: 21 });
    jest.spyOn(service as any, 'finishSession').mockResolvedValue({} as any);

    await expect(service.getNextQuestion(21, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('세션 소유자 불일치면 getNextQuestion에서 예외를 반환한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 30,
      userId: 2,
      status: 'ACTIVE',
      completedAt: null,
    });

    await expect(service.getNextQuestion(30, 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('세션 종료 시 COMPLETED 처리가 잘 된다(답변 0개)', async () => {
    const { service, sessionsRepository, prisma, userStatsRepository, xpRepository } =
      makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 10,
      userId: 1,
      status: 'ACTIVE',
      completedAt: null,
    });
    prisma.userAnswer.findMany.mockResolvedValue([]);
    prisma.session.update.mockResolvedValue({ id: 10 });
    userStatsRepository.findStatsByUserId.mockResolvedValue({
      level: 1,
      currentXp: 0,
      streakDays: 0,
      updatedAt: new Date(),
    });
    xpRepository.findRequiredXpByLevel.mockResolvedValue(100);

    await service.finishSession(10, 1);

    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  // completeSession에 totalScore/totalTimeSec 집계값 전달
  // updateStatsAtomic에 XP/해결 수/학습 시간/스트릭 갱신값 전달

  it('정상 종료 시 데이터 집계(XP/점수/통계)가 수행된다', async () => {
    const {
      service,
      sessionsRepository,
      prisma,
      userStatsRepository,
      xpRepository,
      xpCalculator,
      streakCalculator,
    } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 15,
      userId: 1,
      status: 'ACTIVE',
      completedAt: null,
      difficulty: 'EASY',
    });
    prisma.userAnswer.findMany.mockResolvedValue([
      { overallScore: 80, timeSpentSec: 10, extraQuestionId: null },
      { overallScore: 90, timeSpentSec: 20, extraQuestionId: 5 },
    ]);
    xpCalculator.calculate.mockReturnValue({
      totalGainedXp: 20,
      detail: { baseXp: 10, difficultyBonus: 5, deepDiveBonus: 5 },
    });
    userStatsRepository.findStatsByUserId.mockResolvedValue({
      level: 1,
      currentXp: 10,
      streakDays: 1,
      updatedAt: new Date(),
    });
    streakCalculator.calculate.mockReturnValue(2);
    xpRepository.findRequiredXpByLevel.mockResolvedValue(100);

    await service.finishSession(15, 1);

    expect(xpCalculator.calculate).toHaveBeenCalledWith('EASY', [
      { extraQuestionId: null },
      { extraQuestionId: '5' },
    ]);
    expect(sessionsRepository.completeSession).toHaveBeenCalledWith(
      15,
      expect.objectContaining({
        totalScore: 170,
        totalTimeSec: 30,
      }),
      expect.anything(),
    );
    expect(userStatsRepository.updateStatsAtomic).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        addedXp: 20,
        addedSolvedCount: 2,
        addedStudyTime: 30,
        streakDays: 2,
      }),
      expect.anything(),
    );
  });
});
