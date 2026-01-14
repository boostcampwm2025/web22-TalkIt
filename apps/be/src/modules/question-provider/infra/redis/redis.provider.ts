import { Global, Module } from '@nestjs/common';

// 의존성 미존재 시를 고려한 매우 얕은 Redis 클라이언트 래퍼
// 실제 실행 시에는 ioredis 또는 redis v4 클라이언트를 설치해 교체 가능
class NoopRedisClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async srandmember(_key: string): Promise<string | null> {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async del(_patternOrKey: string): Promise<void> {
    /* noop */
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sadd(_key: string, _members: string[]): Promise<number> {
    return 0;
  }
}

// 간단한 토큰으로 내보냄
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        try {
          // 우선 node-redis v4를 시도

          const { createClient } = require('redis');
          const client = createClient({
            url: `redis://${process.env.REDIS_HOST ?? '127.0.0.1'}:${process.env.REDIS_PORT ?? '6379'}`,
            password: process.env.REDIS_PASSWORD,
          });
          client.connect().catch(() => void 0);
          return client;
        } catch {
          try {
            // ioredis 백업

            const Redis = require('ioredis');
            return new Redis({
              host: process.env.REDIS_HOST ?? '127.0.0.1',
              port: Number(process.env.REDIS_PORT ?? '6379'),
              password: process.env.REDIS_PASSWORD,
            });
          } catch {
            return new NoopRedisClient();
          }
        }
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisProviderModule {}
