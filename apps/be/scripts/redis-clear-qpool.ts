/*
 * Redis에서 QPOOL_PREFIX(기본 'qpool')로 시작하는 모든 키를 안전하게 삭제합니다.
 * 사용: pnpm run cache:clear-qpool
 */
import { createClient } from 'redis';

async function main() {
  const host = process.env.REDIS_HOST ?? '127.0.0.1';
  const port = Number(process.env.REDIS_PORT ?? '6379');
  const password = process.env.REDIS_PASSWORD;
  const prefix = process.env.QPOOL_PREFIX ?? 'qpool';
  const pattern = `${prefix}:*`;

  const client = createClient({ url: `redis://${host}:${port}`, password });
  await client.connect();

  let cursor = 0;
  let total = 0;
  do {
    const res = await client.scan(cursor, { MATCH: pattern, COUNT: 500 });
    cursor = typeof res.cursor === 'number' ? res.cursor : Number(res.cursor);
    const keys: string[] = Array.isArray(res.keys) ? (res.keys as any) : (res as any)[1] ?? [];
    if (keys.length) {
      const deleted = await client.del(keys);
      total += Number(deleted ?? 0);
      console.log(`Deleted ${deleted} keys (running total=${total})`);
    }
  } while (cursor !== 0);

  await client.quit();
  console.log(`Done. Total deleted=${total} (pattern='${pattern}')`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

