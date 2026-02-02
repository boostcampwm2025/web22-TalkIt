import { InternalServerErrorException, Logger } from '@nestjs/common';

import { SttService } from './stt.service';

describe('SttService', () => {
  const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

  afterAll(() => {
    loggerErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });
  const makeService = () => {
    const clovaSttProvider = {
      requestSTT: jest.fn(),
    };
    const questionLoader = {
      loadQuestionMeta: jest.fn(),
    };

    const service = new SttService(clovaSttProvider as any, questionLoader as any);

    return { service, clovaSttProvider, questionLoader };
  };

  it('questionId로 STT를 수행하고 텍스트를 반환한다', async () => {
    const { service, clovaSttProvider, questionLoader } = makeService();

    questionLoader.loadQuestionMeta.mockResolvedValue({
      questionId: 10,
      topicId: 'OS',
      mustInclude: ['process', 'thread'],
    });
    clovaSttProvider.requestSTT.mockResolvedValue('transcribed text');

    const result = await service.transcribe({
      objectKey: 'obj-key',
      language: 'Kor',
      questionId: 10,
    });

    expect(result.text).toBe('transcribed text');
    expect(questionLoader.loadQuestionMeta).toHaveBeenCalledWith({
      questionId: 10,
      extraQuestionId: undefined,
    });
    expect(clovaSttProvider.requestSTT).toHaveBeenCalledWith('obj-key', 'Kor', expect.any(Array));
  });

  it('extraQuestionId로 STT를 수행하고 텍스트를 반환한다', async () => {
    const { service, clovaSttProvider, questionLoader } = makeService();

    questionLoader.loadQuestionMeta.mockResolvedValue({
      questionId: 20,
      topicId: 'OS',
      mustInclude: ['deadlock'],
    });
    clovaSttProvider.requestSTT.mockResolvedValue('text');

    const result = await service.transcribe({
      objectKey: 'obj-key-2',
      language: 'Kor',
      extraQuestionId: 99,
    });

    expect(result.text).toBe('text');
    expect(questionLoader.loadQuestionMeta).toHaveBeenCalledWith({
      questionId: undefined,
      extraQuestionId: 99,
    });
  });

  it('questionId/extraQuestionId가 모두 없거나 모두 있으면 에러를 반환한다', async () => {
    const { service } = makeService();

    await expect(
      service.transcribe({
        objectKey: 'obj',
        language: 'Kor',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    await expect(
      service.transcribe({
        objectKey: 'obj',
        language: 'Kor',
        questionId: 1,
        extraQuestionId: 2,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('Clova STT 호출 실패 시 InternalServerErrorException을 반환한다', async () => {
    const { service, clovaSttProvider, questionLoader } = makeService();

    questionLoader.loadQuestionMeta.mockResolvedValue({
      questionId: 10,
      topicId: 'OS',
      mustInclude: ['process'],
    });
    clovaSttProvider.requestSTT.mockRejectedValue(new Error('clova error'));

    await expect(
      service.transcribe({
        objectKey: 'obj',
        language: 'Kor',
        questionId: 10,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
