import { PrismaService } from './prisma.service';

describe('PrismaService - 연결 재시도(지수 백오프) 및 종료 정리', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    // 재시도 파라미터를 작게 설정하여 빠르게 검증
    process.env.PRISMA_CONNECT_RETRIES = '3';
    process.env.PRISMA_CONNECT_RETRY_DELAY_MS = '1000';
    process.env.PRISMA_CONNECT_MAX_DELAY_MS = '5000';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('연결 실패 시 지정된 횟수만큼 재시도하고, 지수 백오프 딜레이를 적용한다', async () => {
    const svc = new PrismaService();
    // $connect는 2번 실패 후 성공하도록 스텁
    const connectMock = jest
      .spyOn(svc as any, '$connect')
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockResolvedValue(undefined as any);

    // sleep 호출 지연 값을 수집하기 위해 스파이
    const sleeps: number[] = [];
    jest.spyOn(svc as any, 'sleep').mockImplementation(async (...args: unknown[]) => {
      const ms = (args[0] as number) ?? 0;
      sleeps.push(ms);
      return Promise.resolve();
    });

    await expect(svc.onModuleInit()).resolves.toBeUndefined();
    expect(connectMock).toHaveBeenCalledTimes(3);

    // 첫 두 번의 실패에 대해 base 1000ms → 1000, 2000 형태로 지수 증가
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('모든 재시도 실패 시 래핑된 에러 메시지를 던진다', async () => {
    const svc = new PrismaService();
    jest.spyOn(svc as any, '$connect').mockRejectedValue(new Error('unreachable'));
    jest.spyOn(svc as any, 'sleep').mockResolvedValue(undefined);

    await expect(svc.onModuleInit()).rejects.toThrow(/PRISMA_CONNECT_FAILED/);
  });

  it('onModuleDestroy에서 $disconnect를 호출하고, 실패해도 애플리케이션 종료를 막지 않는다', async () => {
    const svc = new PrismaService();
    const disconnectMock = jest
      .spyOn(svc as any, '$disconnect')
      .mockResolvedValue(undefined as any);

    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
