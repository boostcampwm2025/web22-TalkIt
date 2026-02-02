import { Logger, NotFoundException } from '@nestjs/common';

import { normalizeAudio } from '../../../common/audio/normalize-audio';
import { SessionsRecordService } from './sessions-record.service';

jest.mock('../../../common/audio/normalize-audio', () => ({
  normalizeAudio: jest.fn(async () => ({
    buffer: Buffer.from('audio'),
    contentType: 'audio/wav',
    filename: 'test.wav',
  })),
}));

describe('SessionsRecordService', () => {
  const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

  afterAll(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  const makeService = () => {
    const sessionsRepository = {
      findById: jest.fn(),
    };
    const storageProvider = {
      upload: jest.fn(),
      deleteObject: jest.fn(),
    };
    const sttService = {
      transcribe: jest.fn(),
    };
    const normalizeService = {
      normalizeForDraft: jest.fn(),
    };

    const service = new SessionsRecordService(
      sessionsRepository as any,
      storageProvider as any,
      sttService as any,
      normalizeService as any,
    );

    return { service, sessionsRepository, storageProvider, sttService, normalizeService };
  };

  it('세션이 없으면 NotFoundException을 반환한다', async () => {
    const { service, sessionsRepository } = makeService();

    sessionsRepository.findById.mockResolvedValue(null);

    await expect(service.record(1, { questionId: 1 } as any, {} as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('정상적으로 STT/정규화 처리 후 sttText를 반환한다', async () => {
    const { service, sessionsRepository, storageProvider, sttService, normalizeService } =
      makeService();

    sessionsRepository.findById.mockResolvedValue({ id: 1 });
    storageProvider.upload.mockResolvedValue('obj-key');
    sttService.transcribe.mockResolvedValue({ text: 'raw stt' });
    normalizeService.normalizeForDraft.mockResolvedValue({ draftText: 'normalized' });

    const result = await service.record(1, { questionId: 1 } as any, {} as any);

    expect(result.sttText).toBe('normalized');
    expect(storageProvider.upload).toHaveBeenCalled();
    expect(sttService.transcribe).toHaveBeenCalledWith({
      objectKey: 'obj-key',
      language: 'ko-KR',
      questionId: 1,
      extraQuestionId: undefined,
    });
    expect(storageProvider.deleteObject).toHaveBeenCalledWith('obj-key');
  });

  it('STT 과정에서 에러가 발생하면 에러를 던지고 임시 객체를 삭제한다', async () => {
    const { service, sessionsRepository, storageProvider, sttService } = makeService();

    sessionsRepository.findById.mockResolvedValue({ id: 1 });
    storageProvider.upload.mockResolvedValue('obj-key');
    sttService.transcribe.mockRejectedValue(new Error('stt error'));

    await expect(service.record(1, { questionId: 1 } as any, {} as any)).rejects.toBeInstanceOf(
      Error,
    );

    expect(storageProvider.deleteObject).toHaveBeenCalledWith('obj-key');
  });

  it('normalizeAudio 실패 시 에러를 던진다', async () => {
    const { service, sessionsRepository, storageProvider } = makeService();

    sessionsRepository.findById.mockResolvedValue({ id: 1 });
    (normalizeAudio as jest.Mock).mockRejectedValueOnce(new Error('normalize fail'));

    await expect(service.record(1, { questionId: 1 } as any, {} as any)).rejects.toBeInstanceOf(
      Error,
    );

    // normalize 실패 시 objectKey가 없으므로 deleteObject 호출되지 않아야 함
    expect(storageProvider.deleteObject).not.toHaveBeenCalled();
  });
});
