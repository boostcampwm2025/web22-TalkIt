import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { GoldenSystemPrompt, GoldenUserPrompt } from '../prompt/prompt.template';
import IORedis from 'ioredis';
import { createHash } from 'node:crypto';

export const GOLDEN_CACHE_REDIS = Symbol('GOLDEN_CACHE_REDIS');

@Injectable()
export class LlmGoldenProvider implements OnApplicationShutdown {
  private readonly logger = new Logger(LlmGoldenProvider.name);
  constructor(
    private readonly clova: ClovaService,
    @Inject(GOLDEN_CACHE_REDIS) private readonly redis: IORedis,
  ) {}

  async generate(params: { questionSummary: string }): Promise<{
    definition: string;
    key_points: string[];
    examples?: string[];
    pitfalls?: string[];
  }> {
    const { questionSummary } = params;
    const apiKey = (process.env.CLOVA_API_KEY_GOLDEN ?? process.env.CLOVA_API_KEY ?? '').trim();
    const cacheTtlSec = Number(process.env.CLOVA_GOLDEN_CACHE_TTL_SEC ?? '86400');
    const cacheKey = this.cacheKey(questionSummary);

    // 캐시가 있으면 LLM 호출 없이 재사용
    if (cacheTtlSec > 0) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return this.toGolden(parsed, questionSummary);
        }
      } catch (e: any) {
        this.logger.warn(`Golden cache read failed: ${e?.message ?? e}`);
      }
    }
    const messages = [
      { role: 'system' as const, content: GoldenSystemPrompt },
      { role: 'user' as const, content: GoldenUserPrompt(questionSummary) },
    ];
    const out = await this.clova.chat(messages, {
      temperature: 0.1,
      maxCompletionTokens: 1500,
      stream: false,
      apiKey,
    });
    const text = (out.content ?? '').trim();
    // 1) 직파싱 → 2) 정리 후 파싱 → 3) 재요청(강조) → 실패 시 폴백
    try {
      const golden = this.parseGoldenJson(text, questionSummary);
      await this.writeCache(cacheKey, golden, cacheTtlSec);
      return golden;
    } catch {
      // reinforce with stronger formatting/safety guidance
      const reinforce =
        '\n\n[IMPORTANT]\n마크다운/코드블록 금지. 반드시 유효한 JSON 한 줄로만 출력하세요. 문자열 값 내부 큰따옴표(\") 금지(필요 시 \\ \" 로 이스케이프). 백틱/줄바꿈 금지. 각 배열 요소는 120자 이내의 간결한 문장으로 작성.';
      const out2 = await this.clova.chat(
        [
          { role: 'system' as const, content: GoldenSystemPrompt },
          { role: 'user' as const, content: GoldenUserPrompt(questionSummary) + reinforce },
        ],
        { temperature: 0, maxCompletionTokens: 700, stream: false, apiKey },
      );
      const text2 = (out2.content ?? '').trim();
      try {
        const golden = this.parseGoldenJson(text2, questionSummary);
        await this.writeCache(cacheKey, golden, cacheTtlSec);
        return golden;
      } catch (e2) {
        this.logger.warn(
          `Golden parse failed, falling back minimal: ${(e2 as any)?.message ?? e2}`,
        );
        const fallback = { definition: questionSummary, key_points: [] };
        await this.writeCache(cacheKey, fallback, cacheTtlSec);
        return fallback;
      }
    }
  }

  async getCached(questionSummary: string) {
    const cacheKey = this.cacheKey(questionSummary);
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return this.toGolden(parsed, questionSummary);
    } catch (e: any) {
      this.logger.warn(`Golden cache read failed: ${e?.message ?? e}`);
      return null;
    }
  }

  private parseGoldenJson(text: string, questionSummary: string) {
    try {
      const json = JSON.parse(text);
      return this.toGolden(json, questionSummary);
    } catch {
      const cleaned = this.prepareLikelyJson(text);
      const json = JSON.parse(cleaned);
      return this.toGolden(json, questionSummary);
    }
  }

  private toGolden(json: any, questionSummary: string) {
    const def = String(json?.definition ?? questionSummary);
    const kp = Array.isArray(json?.key_points) ? json.key_points.map(String) : [];
    const ex = Array.isArray(json?.examples) ? json.examples.map(String) : [];
    const pf = Array.isArray(json?.pitfalls) ? json.pitfalls.map(String) : [];
    return { definition: def, key_points: kp, examples: ex, pitfalls: pf };
  }

  private cacheKey(questionSummary: string) {
    const hash = createHash('sha256').update(questionSummary).digest('hex').slice(0, 32);
    return `assessment:golden:${hash}`;
  }

  private async writeCache(key: string, value: any, ttlSec: number) {
    if (ttlSec <= 0) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch (e: any) {
      this.logger.warn(`Golden cache write failed: ${e?.message ?? e}`);
    }
  }

  async onApplicationShutdown() {
    await this.redis?.quit?.().catch(() => undefined);
  }

  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();
    // 코드블록 제거
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    // 스마트 따옴표 치환
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");

    // 첫 번째 완결된 JSON 객체만 절취(여러 객체/설명 혼재 대응)
    const i0 = t.indexOf('{');
    if (i0 >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = i0; i < t.length; i++) {
        const ch = t[i];
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === '\\') {
            esc = true;
          } else if (ch === '"') {
            inStr = false;
          }
        } else {
          if (ch === '"') inStr = true;
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              t = t.slice(i0, i + 1);
              break;
            }
          }
        }
      }
    }
    // 흔한 오류: 트레일링 콤마 제거
    t = t.replace(/,\s*([}\]])/g, '$1');
    return t.trim();
  }
}
