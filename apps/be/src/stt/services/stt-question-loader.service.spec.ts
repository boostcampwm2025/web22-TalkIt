import { SttQuestionLoaderService } from './stt-question-loader.service';

describe('SttQuestionLoaderService', () => {
  const makeService = () => {
    const prisma = {
      question: { findUnique: jest.fn() },
      extraQuestion: { findUnique: jest.fn() },
    };
    const service = new SttQuestionLoaderService(prisma as any);
    return { service, prisma };
  };

  it('questionId로 질문 메타를 반환한다', async () => {
    const { service, prisma } = makeService();

    prisma.question.findUnique.mockResolvedValue({
      id: 10,
      content: 'Q',
      topicId: 'OS',
      mustInclude: ['a'],
    });

    const result = await service.loadQuestionMeta({ questionId: 10 });

    expect(result).toEqual({
      questionId: 10,
      content: 'Q',
      topicId: 'OS',
      mustInclude: ['a'],
    });
    expect(prisma.question.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: {
        id: true,
        content: true,
        topicId: true,
        mustInclude: true,
      },
    });
  });

  it('extraQuestionId로 꼬리질문 메타를 반환한다', async () => {
    const { service, prisma } = makeService();

    prisma.extraQuestion.findUnique.mockResolvedValue({
      id: 20,
      content: 'EQ',
      mustInclude: ['b'],
    });

    const result = await service.loadQuestionMeta({ extraQuestionId: 20 });

    expect(result).toEqual({
      questionId: 20,
      content: 'EQ',
      topicId: '',
      mustInclude: ['b'],
    });
    expect(prisma.extraQuestion.findUnique).toHaveBeenCalledWith({
      where: { id: 20 },
      select: {
        id: true,
        content: true,
        mustInclude: true,
      },
    });
  });

  it('questionId/extraQuestionId가 모두 없거나 모두 있으면 에러를 던진다', async () => {
    const { service } = makeService();

    await expect(service.loadQuestionMeta({})).rejects.toThrow('INVALID_QUESTION_TARGET');
    await expect(service.loadQuestionMeta({ questionId: 1, extraQuestionId: 2 })).rejects.toThrow(
      'INVALID_QUESTION_TARGET',
    );
  });

  it('질문이 없으면 QUESTION_NOT_FOUND 에러를 던진다', async () => {
    const { service, prisma } = makeService();

    prisma.question.findUnique.mockResolvedValue(null);

    await expect(service.loadQuestionMeta({ questionId: 999 })).rejects.toThrow(
      'QUESTION_NOT_FOUND',
    );
  });

  it('꼬리질문이 없으면 EXTRA_QUESTION_NOT_FOUND 에러를 던진다', async () => {
    const { service, prisma } = makeService();

    prisma.extraQuestion.findUnique.mockResolvedValue(null);

    await expect(service.loadQuestionMeta({ extraQuestionId: 999 })).rejects.toThrow(
      'EXTRA_QUESTION_NOT_FOUND',
    );
  });
});
