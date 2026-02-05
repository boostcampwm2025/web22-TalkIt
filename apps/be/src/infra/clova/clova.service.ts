// CLOVA 챗 API 호출 서비스
// - 요청/응답 생성, 스키마 검증, 오류 처리, 콘텐츠/토큰 추출까지 캡슐화
// - 외부에서는 chat(messages, options)만 호출하면 결과를 일관되게 획득
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ChatMessage, ChatOptions, ChatResult } from './dtos/types';
import { buildChatRequestBody, generateRequestId, makeChatUrl, makeHeaders } from './utils/request';
import {
  extractContentFromCandidates,
  parseJsonOrThrow,
  safeParseClovaResponse,
  throwHttpErrorFromClovaBodyIfAny,
} from './utils/response';

function parseRetryAfterMs(res: Response): number | null {
  // Retry-After 우선
  const ra = res.headers.get('retry-after');
  if (ra) {
    const sec = Number(ra);
    if (!Number.isNaN(sec) && sec >= 0) return Math.max(0, Math.floor(sec * 1000));
    const dateMs = Date.parse(ra);
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  }
  // Reset 헤더(요청/토큰) 중 가장 늦게 리셋되는 값을 사용
  const candidates: (string | null)[] = [
    res.headers.get('x-ratelimit-reset'),
    res.headers.get('x-ratelimit-reset-requests'),
    res.headers.get('x-ratelimit-reset-tokens'),
  ];
  let maxMs: number | null = null;
  for (const reset of candidates) {
    if (!reset) continue;
    const asNum = Number(reset);
    if (!Number.isNaN(asNum)) {
      const epochMs = asNum > 10_000_000_000 ? asNum : asNum * 1000;
      const wait = Math.max(0, Math.floor(epochMs - Date.now()));
      if (maxMs === null || wait > maxMs) maxMs = wait;
    }
  }
  return maxMs;
}

function jitter(ms: number, spread = 0.4): number {
  const low = Math.floor(ms * (1 - spread / 2));
  const high = Math.floor(ms * (1 + spread / 2));
  return Math.max(0, low + Math.floor(Math.random() * Math.max(1, high - low)));
}

function logRateHeaders(logger: Logger, res: Response, requestId: string) {
  try {
    const entries: Record<string, string | null> = {};
    [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'x-ratelimit-limit-requests',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-reset-requests',
      'x-ratelimit-limit-tokens',
      'x-ratelimit-remaining-tokens',
      'x-ratelimit-reset-tokens',
      'retry-after',
    ].forEach((k) => (entries[k] = res.headers.get(k)));
    logger.error(
      `CLOVA rate headers req=${requestId} ${Object.entries(entries)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`,
    );
  } catch {
    // ignore
  }
}

@Injectable()
export class ClovaService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(ClovaService.name);

  private makePreview(input: unknown, limit = 800): string {
    try {
      const raw = typeof input === 'string' ? input : JSON.stringify(input);
      return raw.replace(/\s+/g, ' ').slice(0, limit);
    } catch {
      return '[preview-unavailable]';
    }
  }

  constructor(private readonly config: ConfigService) {
    // 기본 URL을 최신 문서 기준의 스트리밍 도메인으로 변경
    this.baseUrl =
      this.config.get<string>('CLOVA_BASE_URL') ?? 'https://clovastudio.stream.ntruss.com';
    this.model = this.config.get<string>('CLOVA_MODEL') ?? 'HCX-007';
    this.apiKey = this.config.get<string>('CLOVA_API_KEY') ?? '';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const url = makeChatUrl(this.baseUrl, this.model);
    const requestId = generateRequestId();

    // SO(JSON) 모드: thinking.effort=none 강제(미지정 시 low 적용 충돌 방지)
    if (options.responseFormat?.type === 'json') {
      const effort = options.thinking?.effort;
      if (effort && effort !== 'none') {
        this.logger.debug(
          `CLOVA options: responseFormat=json → thinking.effort=none으로 강제됩니다. req=${requestId}`,
        );
      }
      if (options.noThinking) {
        this.logger.debug(
          `CLOVA options: responseFormat=json → noThinking은 무시되고 thinking.effort=none이 적용됩니다. req=${requestId}`,
        );
      }
    }

    const maxAttempts = Math.max(1, Number(this.config.get<string>('CLOVA_RETRY_ATTEMPTS') ?? '5'));
    const baseBackoffMs = Math.max(
      200,
      Number(this.config.get<string>('CLOVA_RETRY_BASE_MS') ?? '800'),
    );
    const maxBackoffMs = Math.max(
      baseBackoffMs,
      Number(this.config.get<string>('CLOVA_RETRY_MAX_MS') ?? '8000'),
    );

    const body = buildChatRequestBody(messages, options);
    this.logger.debug(`CLOVA request body preview req=${requestId} ${this.makePreview(body)}`);

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let res: Response | null = null;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: makeHeaders(this.apiKey, requestId),
          body: JSON.stringify(body),
        });

        const contentType = res.headers.get('content-type') ?? '';
        const rawText = await res.text();
        this.logger.debug(
          `CLOVA response body preview req=${requestId} ${this.makePreview(rawText)}`,
        );

        let parsedJson: unknown;
        try {
          parsedJson = parseJsonOrThrow(rawText, res, requestId, contentType);
        } catch (e) {
          this.logger.error(
            `CLOVA parse error req=${requestId} status=${res.status} ct=${contentType} msg=${(e as Error)?.message ?? e}`,
          );
          throw e;
        }
        const sp = safeParseClovaResponse(parsedJson);
        const json: unknown = sp.ok ? sp.data : parsedJson;

        // CLOVA 전용 status.code를 HTTP 에러로 정규화하여 필요 시 예외로 전파
        throwHttpErrorFromClovaBodyIfAny(json, requestId, this.logger);

        // HTTP 에러인 경우 예외로 전파
        if (!res.ok) {
          const preview = rawText.replace(/\s+/g, ' ').slice(0, 200);
          this.logger.error(
            `CLOVA http error req=${requestId} status=${res.status} ct=${contentType} preview=${preview}`,
          );
          throw new HttpException(
            {
              statusCode: res.status,
              message: 'CLOVA request failed',
              details: json,
              requestId,
            },
            res.status,
          );
        }

        // 성공 시 콘텐츠 추출 후 반환
        const content = extractContentFromCandidates(json);
        return { requestId, content, raw: json };
      } catch (e) {
        lastErr = e;
        // BullMQ/상위 계층에서 429를 구분할 수 있도록 로그와 백오프 수행
        const status: number | undefined =
          (e as any)?.status ?? (e as any)?.response?.status ?? (e as any)?.statusCode;
        const retryableHttp = typeof status === 'number' && (status === 429 || status >= 500);
        const networkish = /network|timeout|ECONN|ETIMEDOUT/i.test(
          String((e as Error)?.message ?? ''),
        );
        const shouldRetry = retryableHttp || networkish;
        if (!shouldRetry || attempt >= maxAttempts) {
          if (retryableHttp && (e as any)?.status === 429 && (res as any)) {
            logRateHeaders(this.logger, res as Response, requestId);
          }
          break;
        }

        let waitMs = res ? parseRetryAfterMs(res) : null;
        if (waitMs === null || waitMs <= 0) {
          const expo = Math.min(maxBackoffMs, baseBackoffMs * 2 ** (attempt - 1));
          waitMs = jitter(expo, 0.5);
        }
        if (retryableHttp && res && (res.status === 429 || status === 429)) {
          logRateHeaders(this.logger, res, requestId);
          this.logger.warn(
            `CLOVA 429: backing off ${waitMs}ms (attempt ${attempt}/${maxAttempts}) req=${requestId}`,
          );
        } else {
          this.logger.warn(
            `CLOVA retryable error: backing off ${waitMs}ms (attempt ${attempt}/${maxAttempts}) req=${requestId} msg=${(e as Error)?.message ?? e}`,
          );
        }
        await new Promise((r) => setTimeout(r, Math.max(50, waitMs)));
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}
