import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ClovaService } from '../../../infra/clova/clova.service';
import type { LlmClient } from '../llm.client';
import type { TopicSeed } from '../types';
import { extractJsonArray } from '../utils/json-extractor';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('llm_timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e instanceof Error ? e : new Error(String(e)));
    });
  });
}

@Injectable()
export class RealClovaStudioClient implements LlmClient {
  private readonly logger = new Logger(RealClovaStudioClient.name);

  constructor(
    private readonly clova: ClovaService,
    private readonly config: ConfigService,
  ) {}

  async generateBlueprintBatch(
    prompt: string,
    seed: TopicSeed,
    _nPerCell: number,
  ): Promise<unknown> {
    const started = Date.now();
    const promptLen = prompt.length;
    const expectedCount =
      seed.allowedConceptLevels.length * seed.allowedQuestionDepths.length * _nPerCell;

    const maxTokensEnv = Number(this.config.get<string>('LLM_MAX_TOKENS') ?? '1500');
    const temperatureEnv = Number(this.config.get<string>('LLM_TEMPERATURE') ?? '0.2');
    const timeoutMsEnv = Number(this.config.get<string>('LLM_TIMEOUT_MS') ?? '45000');

    const maxTokens = clamp(Number.isFinite(maxTokensEnv) ? maxTokensEnv : 1500, 300, 2500);
    const temperature = Number.isFinite(temperatureEnv) ? temperatureEnv : 0.2;
    const timeoutMs = Number.isFinite(timeoutMsEnv) ? timeoutMsEnv : 45_000;

    const system =
      'You are a helpful assistant. Output only a compact JSON array. No markdown. No extra text.';

    const messages = [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: prompt },
    ];

    // 단순 지수 백오프로 재시도
    const maxRetries = 2; // in addition to the first attempt
    let attempt = 0;
    let lastErr: unknown;
    let reqId: string | undefined;
    let content: string | undefined;
    type ClovaChat = Awaited<ReturnType<ClovaService['chat']>>;
    type ClovaRaw = ClovaChat['raw'];
    let raw: ClovaRaw | undefined;

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

        reqId = res.requestId;
        content = res.content;
        raw = res.raw;

        const elapsed = Date.now() - attemptStart;
        const usage = raw?.result?.usage ?? raw?.usage;
        const tokens =
          usage?.outputTokens ??
          usage?.completionTokens ??
          usage?.totalTokens ??
          usage?.tokens ??
          undefined;
        this.logger.log(
          `clova_call_ok topic=${seed.topicId} req_id=${reqId ?? 'n/a'} expected_count=${expectedCount} prompt_len=${promptLen} tokens=${
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
                '\n\n반드시 단일 JSON 배열만 반환하세요. 마크다운/설명/추가 텍스트 금지. 유효한 JSON 배열만 출력하고, 최종 배열 길이는 요구된 개수와 정확히 일치해야 합니다.',
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
          const repairContent = repair.content;
          const repairRaw = repair.raw;
          const repairReqId = repair.requestId;
          const repairElapsed = Date.now() - repairStart;
          const rUsage = repairRaw?.result?.usage ?? repairRaw?.usage;
          const rTokens =
            rUsage?.outputTokens ??
            rUsage?.completionTokens ??
            rUsage?.totalTokens ??
            rUsage?.tokens ??
            undefined;
          this.logger.warn(
            `clova_repair topic=${seed.topicId} req_id=${repairReqId ?? 'n/a'} expected_count=${expectedCount} prompt_len=${promptLen} tokens=${
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
          `clova_call_err topic=${seed.topicId} expected_count=${expectedCount} prompt_len=${promptLen} elapsed_ms=${elapsed} attempt=${
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
    const toMessage = (e: unknown): string => {
      if (e instanceof Error) return e.message;
      if (typeof e === 'string') return e;
      if (typeof e === 'number' || typeof e === 'boolean') return String(e);
      return 'clova_failed';
    };
    throw lastErr instanceof Error ? lastErr : new Error(toMessage(lastErr));
  }
}
