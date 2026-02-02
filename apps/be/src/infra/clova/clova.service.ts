import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { z } from 'zod';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ThinkingEffort = 'none' | 'low' | 'medium' | 'high';

type ChatOptions = {
  maxCompletionTokens?: number;
  temperature?: number;
  thinking?: { effort: ThinkingEffort };
  stream?: boolean; // 혹시 지원되는 경우 명시적으로 false
  responseFormat?: { type: 'json'; schema: any };
};

@Injectable()
export class ClovaService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(ClovaService.name);

  constructor(private readonly config: ConfigService) {
    // 기본 URL을 최신 문서 기준의 스트리밍 도메인으로 변경
    this.baseUrl =
      this.config.get<string>('CLOVA_BASE_URL') ?? 'https://clovastudio.stream.gov-ntruss.com';
    this.model = this.config.get<string>('CLOVA_MODEL') ?? 'HCX-007';
    this.apiKey = this.config.get<string>('CLOVA_API_KEY') ?? '';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}) {
    const url = `${this.baseUrl}/v3/chat-completions/${this.model}`;
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const startedAt = Date.now();

    const body: any = {
      messages,
      maxCompletionTokens: options.maxCompletionTokens ?? 3000,
      temperature: options.temperature ?? 0.2,
      // 안전하게 명시 (지원되면 JSON으로 고정, 미지원이면 무시될 수 있음)
      stream: options.stream ?? false,
    };
    // Structured Outputs 사용 시 thinking과 동시 사용 불가 → 자동 비활성화
    if (options.responseFormat?.type === 'json') {
      body.responseFormat = { type: 'json', schema: options.responseFormat.schema };
    } else {
      body.thinking = options.thinking ?? { effort: 'medium' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId,
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') ?? '';
    const rawText = await res.text();

    // Minimal schema for Clova chat-completions response
    const usageSchema = z
      .object({
        outputTokens: z.number().optional(),
        completionTokens: z.number().optional(),
        totalTokens: z.number().optional(),
        tokens: z.number().optional(),
      })
      .partial();

    const messageSchema = z.object({
      role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]).optional(),
      // 일부 응답은 content가 문자열이 아닌 배열 형태([{ type, text }])로 올 수 있어 any 허용
      content: z.any().optional(),
    });

    // 문서 기준: status는 항상 존재, result는 Any(없거나 null일 수 있음)
    const clovaSchema = z.object({
      status: z
        .object({
          code: z.string().optional(),
          message: z.string().optional(),
        })
        .optional(),
      result: z.any().nullable().optional(),
      usage: usageSchema.optional(),
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (e) {
      throw new HttpException(
        {
          statusCode: res.status,
          message: e instanceof Error ? e.message : 'CLOVA response parse failed',
          requestId,
          contentType,
          rawTextPreview: rawText.slice(0, 500),
        },
        res.ok ? 500 : res.status,
      );
    }

    // 우선 JSON을 관용적으로 파싱한 뒤, status.code로 성공/실패 판단
    const parsed = clovaSchema.safeParse(parsedJson);
    const json = parsed.success ? parsed.data : (parsedJson as any);

    const bodyStatusCode: string | undefined = json?.status?.code
      ? String(json.status.code)
      : undefined;

    // HTTP가 2xx여도 본문 status.code가 실패(예: 42901)일 수 있어 우선적으로 확인
    if (bodyStatusCode && bodyStatusCode !== '20000') {
      const httpFromBody = /^\d{3}/.test(bodyStatusCode) ? Number(bodyStatusCode.slice(0, 3)) : 400;
      const retryAfter = res.headers.get('retry-after') ?? undefined;
      throw new HttpException(
        {
          statusCode: httpFromBody,
          message: json?.status?.message ?? 'CLOVA error',
          clovaStatus: json?.status,
          requestId,
          retryAfter,
        },
        httpFromBody,
      );
    }

    // 스키마 미스매치 로그는 성공 케이스에서만 디버그 플래그 시 제한적으로 출력
    if (!parsed.success && process.env.CLOVA_SCHEMA_DEBUG === '1') {
      try {
        const issues = parsed.error.issues?.slice?.(0, 5);
        this.logger.debug(
          `CLOVA schema mismatch (ignored). req=${requestId} ct=${contentType} preview=${rawText
            .replace(/\s+/g, ' ')
            .slice(0, 200)}`,
        );
        this.logger.debug(`CLOVA schema issues: ${JSON.stringify(issues)}`);
      } catch {}
    }

    if (!res.ok) {
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

    // Content extraction: handle v3 + thinking variants
    // Try multiple known paths and join segment arrays by their 'text' field.
    const candidates = [
      json?.result?.message?.content,
      json?.result?.outputText,
      json?.result?.choices?.[0]?.message?.content,
      json?.choices?.[0]?.message?.content,
      json?.message?.content,
      json?.outputText,
    ];
    let content: string | undefined = undefined;
    for (const cand of candidates) {
      if (content) break;
      if (typeof cand === 'string' && cand.length > 0) {
        content = cand;
        break;
      }
      if (Array.isArray(cand)) {
        try {
          // Each segment may be a string or an object with { text, type } (thinking/output)
          const parts: string[] = [];
          for (const seg of cand) {
            if (typeof seg === 'string') {
              parts.push(seg);
            } else if (seg && typeof seg.text === 'string') {
              // Optionally ignore pure thinking segments by type
              if (seg.type && typeof seg.type === 'string') {
                // Keep both by default; if needed, filter out seg.type === 'thinking'
              }
              parts.push(seg.text);
            } else if (seg && typeof seg.content === 'string') {
              parts.push(seg.content);
            }
          }
          const joined = parts.join('');
          if (joined) content = joined;
        } catch {
          // ignore and try next candidate
        }
      }
    }
    if (!content) content = '';

    // Success log (including simple usage and latency info)
    try {
      const usage = (json?.result?.usage ?? json?.usage) as
        | { totalTokens?: number; outputTokens?: number; completionTokens?: number }
        | undefined;
      const tokens =
        usage?.totalTokens ?? usage?.outputTokens ?? usage?.completionTokens ?? undefined;
      const latency = Date.now() - startedAt;
      this.logger.log(
        `CLOVA success req=${requestId} model=${this.model} status=${res.status} tokens=${
          tokens ?? 'n/a'
        } len=${content.length} latency=${latency}ms`,
      );
    } catch {}

    return { requestId, content, raw: json };
  }
}
