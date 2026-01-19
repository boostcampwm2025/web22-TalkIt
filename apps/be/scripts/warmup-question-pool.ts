/*
 * Redis 질문 풀 워밍업 스크립트
 * 예: ts-node scripts/warmup-question-pool.ts
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import { QuestionPoolCacheRedis } from '../src/modules/question-provider/infra/redis/question-pool.cache.redis';

function makeRedisClient(): any {
  try {
    const { createClient } = require('redis');
    const client = createClient({
      url: `redis://${process.env.REDIS_HOST ?? '127.0.0.1'}:${process.env.REDIS_PORT ?? '6379'}`,
      password: process.env.REDIS_PASSWORD,
    });
    client.connect().catch(() => void 0);
    return client;
  } catch {
    const Redis = require('ioredis');
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

  const redis = makeRedisClient();
  const cache = new QuestionPoolCacheRedis(redis);

  const domains = ['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'] as const;
  const diffs = ['EASY', 'MEDIUM', 'HARD'] as const;

  // 기존 키 정리: 각 조합의 qpool 키를 명시적으로 삭제 후 재생성
  const keysToDel: string[] = [];
  for (const d of domains) for (const k of diffs) keysToDel.push(`qpool:${d}:${k}`);
  if (keysToDel.length && typeof redis?.del === 'function') {
    try {
      await redis.del(...keysToDel);
    } catch {
      // ignore
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
