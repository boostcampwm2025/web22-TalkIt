import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';

import { AssessmentService } from './assessment.service';

// 레포지토리와 워커를 모킹하여 서비스 레이어의 분기/매핑 로직을 검증합니다.
describe('AssessmentService', () => {
  const repo = {
    findSessionById: jest.fn(),
    createAnswerAndJob: jest.fn(),
    updateAssessmentJob: jest.fn(),
    getAnswerWithRelations: jest.fn(),
    getAssessmentJobByAnswerId: jest.fn(),
  } as any;

  const userCreditsRepo = {
    // AssessmentService 안에서 실제로 쓰는 메서드만 mock 하면 됨
    getTotalCredit: jest.fn(),
  } as any;

  const sessionsService = {
    // 실제로 AssessmentService에서 호출하는 메서드만 있으면 됨
    finishSession: jest.fn(),
  } as any;

  const worker = {
    enqueue: jest.fn(),
  } as any;

  let service: AssessmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssessmentService(repo, worker, userCreditsRepo, sessionsService);
  });

  describe('submitAndAssess', () => {
    it('세션이 없으면 404를 던진다', async () => {
      repo.findSessionById.mockResolvedValue(null);
      await expect(
        service.submitAndAssess(1, 999, { answerText: 'a', timeSpentSec: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('세션 소유자가 아니면 403을 던진다', async () => {
      repo.findSessionById.mockResolvedValue({ id: 10, userId: 2 });
      await expect(
        service.submitAndAssess(1, 10, { answerText: 'a', timeSpentSec: 1 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('성공 시 답변/잡 생성 후 큐에 등록하고 DTO를 반환한다', async () => {
      repo.findSessionById.mockResolvedValue({ id: 10, userId: 1 });
      userCreditsRepo.getTotalCredit.mockResolvedValue(10);
      repo.createAnswerAndJob.mockResolvedValue({ answer: { id: 100 }, job: { id: 200 } });
      worker.enqueue.mockResolvedValue(undefined);

      const out = await service.submitAndAssess(1, 10, {
        questionId: 7,
        answerText: '내용',
        timeSpentSec: 30,
      });

      expect(repo.createAnswerAndJob).toHaveBeenCalled();
      expect(worker.enqueue).toHaveBeenCalledWith(100);
      expect(out).toEqual({ jobId: 200, answerId: 100, status: AssessmentStatus.QUEUED });
    });

    it('큐 등록 실패 시 잡을 FAILED로 업데이트하고 503을 던진다', async () => {
      repo.findSessionById.mockResolvedValue({ id: 10, userId: 1 });
      repo.createAnswerAndJob.mockResolvedValue({ answer: { id: 100 }, job: { id: 200 } });
      worker.enqueue.mockRejectedValue(new Error('redis down'));

      await expect(
        service.submitAndAssess(1, 10, {
          extraQuestionId: 8,
          answerText: '내용',
          timeSpentSec: 30,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(repo.updateAssessmentJob).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          status: AssessmentStatus.FAILED,
        }),
      );
    });
  });

  describe('getSnapshot', () => {
    it('답변이 없으면 404를 던진다', async () => {
      repo.getAnswerWithRelations.mockResolvedValue(null);
      await expect(service.getSnapshot(1, 1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('답변 소유자가 아니면 403을 던진다', async () => {
      repo.getAnswerWithRelations.mockResolvedValue({ id: 11, userId: 2 });
      await expect(service.getSnapshot(1, 11)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('잡이 없으면 404를 던진다', async () => {
      repo.getAnswerWithRelations.mockResolvedValue({ id: 11, userId: 1 });
      repo.getAssessmentJobByAnswerId.mockResolvedValue(null);
      await expect(service.getSnapshot(1, 11)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('잡이 실패 상태면 422를 던진다', async () => {
      repo.getAnswerWithRelations.mockResolvedValue({ id: 11, userId: 1 });
      repo.getAssessmentJobByAnswerId.mockResolvedValue({
        id: 21,
        status: AssessmentStatus.FAILED,
        error: 'x',
      });
      await expect(service.getSnapshot(1, 11)).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('잡이 진행중이면 409를 던진다', async () => {
      repo.getAnswerWithRelations.mockResolvedValue({ id: 11, userId: 1 });
      repo.getAssessmentJobByAnswerId.mockResolvedValue({
        id: 21,
        status: AssessmentStatus.QUEUED,
      });
      await expect(service.getSnapshot(1, 11)).rejects.toBeInstanceOf(ConflictException);
    });

    it('DONE이면 스냅샷 DTO를 반환한다', async () => {
      const answer = {
        id: 11,
        userId: 1,
        answerText: 'my answer',
        overallScore: 88,
        feedbackJson: { accurate: ['장점1'], improvement: ['개선1'] },
        session: { gainedXp: { baseXp: 10, difficultyBonus: 5, deepDiveBonus: 0 } },
        question: { content: '문제 본문' },
        extraQuestion: null,
      };
      repo.getAnswerWithRelations.mockResolvedValue(answer);
      repo.getAssessmentJobByAnswerId.mockResolvedValue({ id: 21, status: AssessmentStatus.DONE });

      const out = await service.getSnapshot(1, 11);

      expect(out).toEqual({
        answerId: 11,
        question: '문제 본문',
        answer: 'my answer',
        overallScore: 88,
        strengths: ['장점1'],
        weaknesses: [],
        suggestions: ['개선1'],
        xp: 15,
        remainingToken: 0,
      });
    });

    it('extraQuestion이 있을 경우 그 내용을 사용한다', async () => {
      const answer = {
        id: 12,
        userId: 1,
        answerText: 'ans',
        overallScore: 10,
        feedbackJson: {},
        session: { gainedXp: { baseXp: 1, difficultyBonus: null, deepDiveBonus: 2 } },
        question: null,
        extraQuestion: { content: '추가 문제 본문' },
      };
      repo.getAnswerWithRelations.mockResolvedValue(answer);
      repo.getAssessmentJobByAnswerId.mockResolvedValue({ id: 22, status: AssessmentStatus.DONE });

      const out = await service.getSnapshot(1, 12);
      expect(out.question).toBe('추가 문제 본문');
      expect(out.xp).toBe(3);
    });
  });
});
