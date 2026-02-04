import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';

import { ASSESS_REDIS, ASSESS_REDIS_EVENTS } from '../worker/assessment.tokens';
import IORedis from 'ioredis';

@Injectable()
export class AssessmentRedisShutdown implements OnApplicationShutdown {
  constructor(
    @Inject(ASSESS_REDIS) private readonly redis: IORedis,
    @Inject(ASSESS_REDIS_EVENTS) private readonly redisEvents: IORedis,
  ) {}

  async onApplicationShutdown() {
    // quit()은 정상 종료, disconnect()는 즉시 끊기
    await this.redis?.quit?.().catch(() => undefined);
    await this.redisEvents?.quit?.().catch(() => undefined);
  }
}
