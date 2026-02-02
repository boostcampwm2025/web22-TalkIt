import { ConflictException, NotFoundException } from '@nestjs/common';

import { DeepDiveService } from './deep-dive.service';

describe('DeepDiveService', () => {
  const makeService = () => {
    const sessionsRepository = {
      findById: jest.fn(),
      transaction: jest.fn(async (fn: any) => fn({})),
      incrementQuestionCount: jest.fn(),
    };
    const createExtraQuestionUseCase = {
      execute: jest.fn(),
    };
    const guideBuilder = {
      build: jest.fn().mockReturnValue(['guide-1']),
    };
    const answerRepository = {
      findByIdWithContext: jest.fn(),
    };
    const sessionsService = {};
    const userCreditsRepository = {
      getTotalCredit: jest.fn(),
    };

    const service = new DeepDiveService(
      sessionsRepository as any,
      createExtraQuestionUseCase as any,
      guideBuilder as any,
      answerRepository as any,
      sessionsService as any,
      userCreditsRepository as any,
    );

    return {
      service,
      sessionsRepository,
      createExtraQuestionUseCase,
      guideBuilder,
      answerRepository,
      userCreditsRepository,
    };
  };

  it('정상적으로 꼬리질문을 생성하고 응답을 반환한다', async () => {
    const {
      service,
      sessionsRepository,
      createExtraQuestionUseCase,
      answerRepository,
      userCreditsRepository,
    } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 10,
      userId: 1,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(3);
    answerRepository.findByIdWithContext.mockResolvedValue({
      id: 100,
      sessionId: 10,
      answerText: 'answer',
    });
    createExtraQuestionUseCase.execute.mockResolvedValue({
      id: 200,
      content: 'followup',
      mustInclude: ['x'],
      category: 'OS',
      difficulty: 'EASY',
      timeLimitSec: 120,
    });
    sessionsRepository.incrementQuestionCount.mockResolvedValue({
      currentQuestionCount: 2,
    });

    const result = await service.execute({ userId: 1, sessionId: 10, answerId: 100 });

    expect(result.question.extraQuestionId).toBe(200);
    expect(result.currentQuestionCount).toBe(2);
    expect(result.remainedCredit).toBe(3);
    // 트랜잭션이 1회 실행되었는지 확인
    expect(sessionsRepository.transaction).toHaveBeenCalledTimes(1);
    // 꼬리질문 생성 유스케이스에 올바른 인자가 전달됐는지 확인
    expect(createExtraQuestionUseCase.execute).toHaveBeenCalledWith({
      sessionId: 10,
      parentAnswerId: 100,
      answerContent: 'answer',
    });
  });

  it('세션이 없거나 소유자가 아니면 예외를 반환한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue(null);
    await expect(
      service.execute({ userId: 1, sessionId: 999, answerId: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    sessionsRepository.findById.mockResolvedValue({
      id: 11,
      userId: 2,
      completedAt: null,
    });
    await expect(service.execute({ userId: 1, sessionId: 11, answerId: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('세션이 완료 상태면 충돌 예외를 반환한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 12,
      userId: 1,
      completedAt: new Date(),
    });

    await expect(service.execute({ userId: 1, sessionId: 12, answerId: 1 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('답변이 없거나 세션이 일치하지 않으면 예외를 반환한다', async () => {
    const { service, sessionsRepository, answerRepository, userCreditsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 13,
      userId: 1,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(3);
    answerRepository.findByIdWithContext.mockResolvedValue(null);

    await expect(service.execute({ userId: 1, sessionId: 13, answerId: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    answerRepository.findByIdWithContext.mockResolvedValue({
      id: 101,
      sessionId: 99,
      answerText: 'answer',
    });

    await expect(
      service.execute({ userId: 1, sessionId: 13, answerId: 101 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('트랜잭션 내부 로직 실패 시 에러를 그대로 던진다', async () => {
    const { service, sessionsRepository, answerRepository, userCreditsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue({
      id: 14,
      userId: 1,
      completedAt: null,
    });
    userCreditsRepository.getTotalCredit.mockResolvedValue(3);
    answerRepository.findByIdWithContext.mockResolvedValue({
      id: 111,
      sessionId: 14,
      answerText: 'answer',
    });
    sessionsRepository.transaction.mockRejectedValue(new Error('tx failed'));

    await expect(service.execute({ userId: 1, sessionId: 14, answerId: 111 })).rejects.toThrow(
      'tx failed',
    );
  });
});
