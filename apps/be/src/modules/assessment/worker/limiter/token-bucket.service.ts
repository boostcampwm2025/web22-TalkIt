import { Inject, Injectable, Logger } from '@nestjs/common';

import { ASSESS_REDIS } from '../assessment.tokens';
import IORedis from 'ioredis';

// 간단한 토큰 버킷 구현: 분당/초당으로 리필되는 버킷에서 amount만큼 차감
// - 키 구조: rl:{name}
// - 값: Hash(tokens:number, ts:number[ms])
// - 파라미터: capacity(버킷 최대치), refillPerSec(초당 리필량), amount(필요 토큰)

const LUA_TAKE = `
local key         = KEYS[1]
local capacity    = tonumber(ARGV[1])
local refill_per_s= tonumber(ARGV[2])
local amount      = tonumber(ARGV[3])
local now_ms      = tonumber(ARGV[4])

local exists = redis.call('EXISTS', key)
local tokens
local ts
if exists == 1 then
  tokens = tonumber(redis.call('HGET', key, 'tokens')) or capacity
  ts     = tonumber(redis.call('HGET', key, 'ts')) or now_ms
else
  tokens = capacity
  ts = now_ms
end

-- 리필 계산
local delta_ms = math.max(0, now_ms - ts)
local refill = (delta_ms / 1000.0) * refill_per_s
tokens = math.min(capacity, tokens + refill)
ts = now_ms

if tokens >= amount then
  tokens = tokens - amount
  redis.call('HSET', key, 'tokens', tokens, 'ts', ts)
  -- 만료(아이들 타임아웃) 2분
  redis.call('PEXPIRE', key, 120000)
  return cjson.encode({ ok = 1, tokens = tokens })
else
  local need = amount - tokens
  local sec_until = need / refill_per_s
  local ms_until = math.ceil(sec_until * 1000)
  redis.call('HSET', key, 'tokens', tokens, 'ts', ts)
  redis.call('PEXPIRE', key, 120000)
  return cjson.encode({ ok = 0, waitMs = ms_until, tokens = tokens })
end
`;

@Injectable()
export class TokenBucketService {
  private readonly logger = new Logger(TokenBucketService.name);
  constructor(@Inject(ASSESS_REDIS) private readonly redis: IORedis) {}

  async tryConsume(
    key: string,
    opts: { capacity: number; refillPerSec: number; amount?: number },
  ): Promise<{ ok: true } | { ok: false; waitMs: number }> {
    const capacity = Math.max(1, Math.floor(opts.capacity));
    const refillPerSec = Math.max(0.001, opts.refillPerSec);
    const amount = Math.max(1, Math.floor(opts.amount ?? 1));
    const now = Date.now();
    const res = (await this.redis.eval(
      LUA_TAKE,
      1,
      key,
      capacity,
      refillPerSec,
      amount,
      now,
    )) as string;
    try {
      const parsed = JSON.parse(res) as { ok: number; waitMs?: number };
      if (parsed.ok === 1) return { ok: true } as const;
      return { ok: false, waitMs: Math.max(1, Math.floor(parsed.waitMs ?? 100)) } as const;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`TokenBucket parse error for key ${key}: ${msg}; raw=${String(res)}`);
      return { ok: false, waitMs: 200 } as const;
    }
  }

  // 토큰이 가능해질 때까지 폴링 대기(워커 슬롯 점유 주의: 짧은 대기 사용 권장)
  async waitUntilAllowed(
    key: string,
    opts: {
      capacity: number;
      refillPerSec: number;
      amount?: number;
      maxWaitMs?: number;
      baseDelayMs?: number;
      jitterMs?: number;
    },
  ): Promise<void> {
    const maxWait = Math.max(0, opts.maxWaitMs ?? 3000);
    const baseDelay = Math.max(10, opts.baseDelayMs ?? 250);
    const jitter = Math.max(0, opts.jitterMs ?? 150);
    const start = Date.now();
    while (true) {
      const take = await this.tryConsume(key, opts);
      if (take.ok) return;
      const elapsed = Date.now() - start;
      if (elapsed >= maxWait) {
        // 마지막으로 한 번 더 시도 후 반환
        const last = await this.tryConsume(key, opts);
        if (last.ok) return;
        const extra = Math.min(last.waitMs, 500);
        await sleep(extra);
        continue;
      }
      const delay = Math.min(baseDelay + Math.floor(Math.random() * jitter), take.waitMs);
      await sleep(delay);
    }
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
