import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '../../../infra/clova/clova.service';
import type { LlmClient } from '../llm.client';
import type { TopicSeed } from '../types';
import { extractJsonArray } from '../utils/json-extractor';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('llm_timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

@Injectable()
export class RealClovaStudioClient implements LlmClient {
  private readonly logger = new Logger(RealClovaStudioClient.name);

  constructor(private readonly clova: ClovaService) {}

  async generateBlueprintBatch(
    prompt: string,
    seed: TopicSeed,
    _nPerCell: number,
  ): Promise<unknown> {
    const started = Date.now();
    const promptLen = prompt.length;

    // Defaults and env overrides
    /* eslint-disable turbo/no-undeclared-env-vars */
    const maxTokensEnv = Number(process.env.LLM_MAX_TOKENS ?? '1500');
    const temperatureEnv = Number(process.env.LLM_TEMPERATURE ?? '0.2');
    const timeoutMsEnv = Number(process.env.LLM_TIMEOUT_MS ?? '45000');
    /* eslint-enable turbo/no-undeclared-env-vars */
    const maxTokens = clamp(Number.isFinite(maxTokensEnv) ? maxTokensEnv : 1500, 300, 2500);
    const temperature = Number.isFinite(temperatureEnv) ? temperatureEnv : 0.2;
    const timeoutMs = Number.isFinite(timeoutMsEnv) ? timeoutMsEnv : 45_000;

    const system =
      'You are a helpful assistant. Output only a compact JSON array. No markdown. No extra text.';

    const messages = [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: prompt },
    ];

    // Retry with simple exponential backoff
    const maxRetries = 2; // in addition to the first attempt
    let attempt = 0;
    let lastErr: unknown;
    let reqId: string | undefined;
    let content: string | undefined;
    let raw: any;

    while (attempt <= maxRetries) {
      const attemptStart = Date.now();
      try {
        const res = await withTimeout(
          this.clova.chat(messages, {
            maxCompletionTokens: maxTokens,
            temperature,
            thinking: { effort: 'low' },
            stream: false,
          }),
          timeoutMs,
        );

        reqId = (res as any)?.requestId;
        content = (res as any)?.content;
        raw = (res as any)?.raw;

        const elapsed = Date.now() - attemptStart;
        const usage = (raw?.result?.usage ?? raw?.usage) || {};
        const tokens =
          usage.outputTokens ??
          usage.completionTokens ??
          usage.totalTokens ??
          usage.tokens ??
          undefined;
        this.logger.log(
          `clova_call_ok topic=${seed.topicId} req_id=${reqId ?? 'n/a'} prompt_len=${promptLen} tokens=${
            tokens ?? 'n/a'
          } elapsed_ms=${elapsed} attempt=${attempt + 1}`,
        );

        if (typeof content !== 'string' || !content.trim()) {
          throw new Error('empty_content');
        }

        // Try to validate JSON once; if not parsable, do a single repair request below.
        let ok = true;
        try {
          extractJsonArray(content);
        } catch {
          ok = false;
        }
        if (!ok) {
          // One repair retry: ask the model to return JSON array only.
          const repairStart = Date.now();
          const repairMessages = [
            { role: 'system' as const, content: system },
            {
              role: 'user' as const,
              content:
                prompt +
                '\n\n반드시 JSON 배열만 반환하세요. 마크다운/설명/추가 텍스트 금지. 유효한 JSON 배열만 출력.',
            },
          ];
          const repair = await withTimeout(
            this.clova.chat(repairMessages, {
              maxCompletionTokens: maxTokens,
              temperature,
              thinking: { effort: 'low' },
              stream: false,
            }),
            timeoutMs,
          );
          const repairContent = (repair as any)?.content as string | undefined;
          const repairRaw = (repair as any)?.raw;
          const repairReqId = (repair as any)?.requestId;
          const repairElapsed = Date.now() - repairStart;
          const rUsage = (repairRaw?.result?.usage ?? repairRaw?.usage) || {};
          const rTokens =
            rUsage.outputTokens ??
            rUsage.completionTokens ??
            rUsage.totalTokens ??
            rUsage.tokens ??
            undefined;
          this.logger.warn(
            `clova_repair topic=${seed.topicId} req_id=${repairReqId ?? 'n/a'} prompt_len=${promptLen} tokens=${
              rTokens ?? 'n/a'
            } elapsed_ms=${repairElapsed}`,
          );
          if (typeof repairContent === 'string' && repairContent.trim()) {
            content = repairContent;
          }
        }

        // Return string; QuestionFactoryService will extract JSON array itself.
        const totalElapsed = Date.now() - started;
        this.logger.log(`llm_total_elapsed_ms=${totalElapsed} topic=${seed.topicId}`);
        return { output: content };
      } catch (e) {
        lastErr = e;
        const elapsed = Date.now() - attemptStart;
        this.logger.warn(
          `clova_call_err topic=${seed.topicId} prompt_len=${promptLen} elapsed_ms=${elapsed} attempt=${
            attempt + 1
          } error=${(e as Error)?.message ?? e}`,
        );
        if (attempt === maxRetries) break;
        const backoffMs = 500 * Math.pow(2, attempt); // 0->500, 1->1000, 2->2000
        await sleep(backoffMs);
      }
      attempt++;
    }

    // All retries exhausted
    throw lastErr ?? new Error('clova_failed');
  }
}
