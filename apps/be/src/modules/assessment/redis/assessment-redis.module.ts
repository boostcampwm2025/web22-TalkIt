import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  ASSESS_EVAL_QUEUE,
  ASSESS_FB_QUEUE,
  ASSESS_REDIS,
  ASSESS_REDIS_EVENTS,
  ASSESS_REWARD_QUEUE,
} from '../worker/assessment.tokens';
import { AssessmentRedisShutdown } from './assessment.redis-shutdown';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Provider 주입 패턴 정리
 * - { provide, inject, useFactory }는 Nest의 '팩토리 프로바이더' 형식입니다.
 *   - provide: DI 토큰(여기서는 심볼)으로 결과 인스턴스를 식별
 *   - inject: useFactory 실행 시 주입할 의존성 토큰 목록
 *   - useFactory: 주입 의존성을 받아 실제 인스턴스 생성 (예: IORedis, Queue)
 * - 모듈 레벨에서 정의하는 이유
 *   - Redis/Queue 같은 연결 리소스를 앱 전역 싱글턴으로 공유해 비용 절감
 *   - 도메인 서비스에서 연결 생성/설정을 분리하여 관심사 분리 및 테스트 용이성 향상
 *   - ConfigService로 런타임 설정 일원화, 종료 훅에서 중앙 관리(quit/close) 용이
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Main Redis connection
    // - ConfigService에서 REDIS_URL을 읽어 런타임에 연결 생성
    // - provide 토큰(ASSESS_REDIS)으로 싱글턴 인스턴스 주입
    {
      provide: ASSESS_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    // Separate connection for QueueEvents streaming
    // - QueueEvents는 Streams read 특성상 별도 커넥션 권장
    {
      provide: ASSESS_REDIS_EVENTS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    // Split-flow stage queues (evaluate/feedback/reward)
    {
      provide: ASSESS_EVAL_QUEUE,
      inject: [ASSESS_REDIS],
      useFactory: (redis: IORedis) => new Queue('assessment-evaluate', { connection: redis }),
    },
    {
      provide: ASSESS_FB_QUEUE,
      inject: [ASSESS_REDIS],
      useFactory: (redis: IORedis) => new Queue('assessment-feedback', { connection: redis }),
    },
    {
      provide: ASSESS_REWARD_QUEUE,
      inject: [ASSESS_REDIS],
      useFactory: (redis: IORedis) => new Queue('assessment-reward', { connection: redis }),
    },
    // 앱 종료 시 Redis 커넥션을 정상 종료
    AssessmentRedisShutdown,
  ],
  exports: [
    ASSESS_REDIS,
    ASSESS_REDIS_EVENTS,
    ASSESS_EVAL_QUEUE,
    ASSESS_FB_QUEUE,
    ASSESS_REWARD_QUEUE,
  ],
})
export class AssessmentRedisModule {}
