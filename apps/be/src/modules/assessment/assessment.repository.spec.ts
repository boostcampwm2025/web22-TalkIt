import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from './assessment.repository';

// PrismaService를 대체할 간단한 목 객체를 구성합니다.
// 각 메서드는 jest.fn()으로 감시 가능하며, 필요 시 원하는 값을 리턴하도록 설정합니다.
describe('AssessmentRepository', () => {
  const prisma = {
    session: { findUnique: jest.fn() },
    userAnswer: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    assessmentJob: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  let repo: AssessmentRepository;

  beforeEach(() => {
    // 각 테스트 전 모든 모의함수 호출 이력을 초기화합니다.
    jest.clearAllMocks();
    repo = new AssessmentRepository(prisma);

    // 기본 트랜잭션 동작: 콜백에 userAnswer/assessmentJob만 주입하고 결과를 그대로 반환
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({ userAnswer: prisma.userAnswer, assessmentJob: prisma.assessmentJob }),
    );
  });

  it('세션 ID로 세션을 조회한다', async () => {
    // given
    prisma.session.findUnique.mockResolvedValue({ id: 1, userId: 10 });

    // when
    const out = await repo.findSessionById(1);

    // then
    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(out).toEqual({ id: 1, userId: 10 });
  });

  it('사용자 답변을 생성한다(questionId 사용)', async () => {
    // given
    prisma.userAnswer.create.mockResolvedValue({ id: 11 });

    // when
    const out = await repo.createUserAnswer({
      userId: 10,
      sessionId: 99,
      questionId: 7,
      answerText: '내용',
      timeSpentSec: 30,
    });

    // then
    expect(prisma.userAnswer.create).toHaveBeenCalledWith({
      data: {
        userId: 10,
        sessionId: 99,
        questionId: 7,
        extraQuestionId: undefined,
        answerText: '내용',
        timeSpentSec: 30,
      },
    });
    expect(out).toEqual({ id: 11 });
  });

  it('사용자 답변을 생성한다(extraQuestionId 사용)', async () => {
    prisma.userAnswer.create.mockResolvedValue({ id: 12 });

    const out = await repo.createUserAnswer({
      userId: 10,
      sessionId: 99,
      extraQuestionId: 8,
      answerText: '추가 질문 답변',
      timeSpentSec: 45,
    });

    expect(prisma.userAnswer.create).toHaveBeenCalledWith({
      data: {
        userId: 10,
        sessionId: 99,
        questionId: undefined,
        extraQuestionId: 8,
        answerText: '추가 질문 답변',
        timeSpentSec: 45,
      },
    });
    expect(out).toEqual({ id: 12 });
  });

  it('평가 작업을 생성한다(초기 상태는 QUEUED)', async () => {
    prisma.assessmentJob.create.mockResolvedValue({
      id: 21,
      answerId: 11,
      status: AssessmentStatus.QUEUED,
    });
    const out = await repo.createAssessmentJob(11);
    expect(prisma.assessmentJob.create).toHaveBeenCalledWith({
      data: { answerId: 11, status: AssessmentStatus.QUEUED },
    });
    expect(out).toEqual({ id: 21, answerId: 11, status: AssessmentStatus.QUEUED });
  });

  it('answerId로 평가 작업을 단일 조회한다', async () => {
    prisma.assessmentJob.findUnique.mockResolvedValue({ id: 21, answerId: 11 });
    const out = await repo.getAssessmentJobByAnswerId(11);
    expect(prisma.assessmentJob.findUnique).toHaveBeenCalledWith({ where: { answerId: 11 } });
    expect(out).toEqual({ id: 21, answerId: 11 });
  });

  it('평가 작업을 업데이트 한다', async () => {
    prisma.assessmentJob.update.mockResolvedValue({ id: 21, status: AssessmentStatus.DONE });
    const out = await repo.updateAssessmentJob(21, { status: AssessmentStatus.DONE });
    expect(prisma.assessmentJob.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: { status: AssessmentStatus.DONE },
    });
    expect(out).toEqual({ id: 21, status: AssessmentStatus.DONE });
  });

  it('답변을 관계와 함께 조회한다', async () => {
    prisma.userAnswer.findUnique.mockResolvedValue({
      id: 11,
      session: {},
      question: {},
      extraQuestion: {},
    });
    const out = await repo.getAnswerWithRelations(11);
    expect(prisma.userAnswer.findUnique).toHaveBeenCalledWith({
      where: { id: 11 },
      include: { session: true, question: true, extraQuestion: true },
    });
    expect(out).toEqual({ id: 11, session: {}, question: {}, extraQuestion: {} });
  });

  it('답변 점수를 업데이트한다', async () => {
    prisma.userAnswer.update.mockResolvedValue({ id: 11, overallScore: 87 });
    const out = await repo.setAnswerScore(11, 87);
    expect(prisma.userAnswer.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { overallScore: 87 },
    });
    expect(out).toEqual({ id: 11, overallScore: 87 });
  });

  it('답변 피드백을 업데이트한다', async () => {
    const feedback = { accurate: ['좋은 구조'], improvement: ['예시 보강'] } as any;
    prisma.userAnswer.update.mockResolvedValue({ id: 11, feedbackJson: feedback });
    const out = await repo.setAnswerFeedback(11, feedback);
    expect(prisma.userAnswer.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { feedbackJson: feedback },
    });
    expect(out).toEqual({ id: 11, feedbackJson: feedback });
  });

  it('트랜잭션으로 답변과 평가 작업을 함께 생성한다', async () => {
    // 트랜잭션 내에서 호출될 create 반환값을 미리 정의합니다.
    prisma.userAnswer.create.mockResolvedValue({ id: 33, userId: 10 });
    prisma.assessmentJob.create.mockResolvedValue({
      id: 44,
      answerId: 33,
      status: AssessmentStatus.QUEUED,
    });

    const out = await repo.createAnswerAndJob({
      userId: 10,
      sessionId: 99,
      questionId: 5,
      answerText: '트랜잭션 생성',
      timeSpentSec: 22,
    });

    // $transaction이 콜백을 받아 실행했는지 확인
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 트랜잭션 안에서 두 create가 호출되었는지 검증
    expect(prisma.userAnswer.create).toHaveBeenCalledWith({
      data: {
        userId: 10,
        sessionId: 99,
        questionId: 5,
        extraQuestionId: undefined,
        answerText: '트랜잭션 생성',
        timeSpentSec: 22,
      },
    });
    expect(prisma.assessmentJob.create).toHaveBeenCalledWith({
      data: { answerId: 33, status: AssessmentStatus.QUEUED },
    });

    expect(out).toEqual({
      answer: { id: 33, userId: 10 },
      job: { id: 44, answerId: 33, status: AssessmentStatus.QUEUED },
    });
  });
});
