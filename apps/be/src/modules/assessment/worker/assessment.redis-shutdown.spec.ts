import { AssessmentRedisShutdown } from './assessment.redis-shutdown';

describe('AssessmentRedisShutdown - 종료시 quit 호출', () => {
  it('두 Redis 클라이언트에 quit를 호출한다(예외는 무시)', async () => {
    const calls: string[] = [];
    const redis = { quit: jest.fn().mockImplementation(async () => calls.push('main')) } as any;
    const redisEvents = {
      quit: jest.fn().mockImplementation(async () => calls.push('events')),
    } as any;

    const shutdown = new AssessmentRedisShutdown(redis, redisEvents);
    await shutdown.onApplicationShutdown();

    expect(redis.quit).toHaveBeenCalled();
    expect(redisEvents.quit).toHaveBeenCalled();
    expect(calls).toEqual(expect.arrayContaining(['main', 'events']));
  });
});
