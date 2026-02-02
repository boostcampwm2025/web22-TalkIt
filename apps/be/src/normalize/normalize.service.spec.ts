import { Logger } from '@nestjs/common';

import { NormalizeService } from './normalize.service';

jest.mock('./utils/pre-normalize', () => ({
  preNormalize: jest.fn((text: string) => `pre:${text}`),
}));

describe('NormalizeService', () => {
  const loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    loggerDebugSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  const makeService = () => {
    const llmCleanupService = {
      cleanup: jest.fn(),
    };
    const service = new NormalizeService(llmCleanupService as any);
    return { service, llmCleanupService };
  };

  it('빈 문자열이면 모두 빈 값으로 반환한다', async () => {
    const { service } = makeService();

    const result = await service.normalizeForDraft('');

    expect(result).toEqual({ rawText: '', preNormalizedText: '', draftText: '' });
  });

  it('짧은 텍스트는 LLM 없이 preNormalize 결과를 사용한다', async () => {
    const { service, llmCleanupService } = makeService();

    const result = await service.normalizeForDraft('짧음');

    expect(result.preNormalizedText).toBe('pre:짧음');
    expect(result.draftText).toBe('pre:짧음');
    expect(llmCleanupService.cleanup).not.toHaveBeenCalled();
  });

  it('충분히 긴 텍스트면 LLM cleanup을 호출한다', async () => {
    const { service, llmCleanupService } = makeService();
    llmCleanupService.cleanup.mockResolvedValue('cleaned');

    const result = await service.normalizeForDraft('a'.repeat(40));

    expect(llmCleanupService.cleanup).toHaveBeenCalled();
    expect(result.draftText).toBe('cleaned');
  });

  it('LLM cleanup 실패 시 preNormalizedText로 fallback한다', async () => {
    const { service, llmCleanupService } = makeService();
    llmCleanupService.cleanup.mockRejectedValue(new Error('fail'));

    const result = await service.normalizeForDraft('a'.repeat(40));

    expect(result.draftText).toBe(`pre:${'a'.repeat(40)}`);
  });
});
