/*
 * Redis 질문 풀 워밍업 스크립트
 * 예: ts-node scripts/warmup-question-pool.ts
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import { QuestionPoolCacheRedis } from '../src/modules/question-provider/infra/redis/question-pool.cache.redis';

async function makeRedisClient(): Promise<any> {
  try {
    const { createClient } = require('redis');
    const client = createClient({
      url: `redis://${process.env.REDIS_HOST ?? '127.0.0.1'}:${process.env.REDIS_PORT ?? '6379'}`,
      password: process.env.REDIS_PASSWORD,
    });
    await client.connect(); // 반드시 연결을 보장
    return client;
  } catch {
    const Redis = require('ioredis');
    // ioredis는 즉시 연결 시도
    return new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect?.();

  const redis = await makeRedisClient();
  const cache = new QuestionPoolCacheRedis(redis);

  const domains = ['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'] as const;
  const diffs = ['EASY', 'MEDIUM', 'HARD'] as const;

  // 기존 키 정리: 각 조합의 qpool 키를 명시적으로 삭제 후 재생성
  const prefix = process.env.QPOOL_PREFIX ?? 'qpool';
  const keysToDel: string[] = [];
  for (const d of domains) for (const k of diffs) keysToDel.push(`${prefix}:${d}:${k}`);
  if (keysToDel.length) {
    try {
      if (typeof redis?.del === 'function') {
        // node-redis v4 / ioredis 모두 가변 인수 지원
        const before = typeof redis?.exists === 'function' ? await redis.exists(...keysToDel) : undefined;
        const deleted = await redis.del(...keysToDel);
        const after = typeof redis?.exists === 'function' ? await redis.exists(...keysToDel) : undefined;
        console.log(`qpool cleanup: existsBefore=${before ?? 'n/a'} deleted=${deleted ?? 'n/a'} existsAfter=${after ?? 'n/a'}`);
      }
    } catch (e) {
      console.warn('Warn: failed to delete existing qpool keys:', (e as any)?.message ?? e);
    }
  }
  for (const d of domains) {
    for (const k of diffs) {
      const rows = await (prisma as any).question.findMany({
        where: { category: d, difficulty: k },
        select: { id: true },
      });
      const ids = rows.map((r: any) => r.id);
      const added = await cache.seedPool(d as any, k as any, ids);
      console.log(`qpool:${d}:${k} size+=${added} (total ${ids.length})`);
    }
  }

  await prisma.$disconnect?.();
  if (redis?.quit) await redis.quit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
