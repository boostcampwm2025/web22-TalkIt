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
};

@Injectable()
export class ClovaService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(ClovaService.name);

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('CLOVA_BASE_URL') ?? 'https://clovastudio.ntruss.com';
    this.model = this.config.get<string>('CLOVA_MODEL') ?? 'HCX-007';
    this.apiKey = this.config.get<string>('CLOVA_API_KEY') ?? '';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}) {
    const url = `${this.baseUrl}/v3/chat-completions/${this.model}`;
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    const body = {
      messages,
      maxCompletionTokens: options.maxCompletionTokens ?? 400,
      temperature: options.temperature ?? 0.2,
      thinking: options.thinking ?? { effort: 'low' },
      // 안전하게 명시 (지원되면 JSON으로 고정, 미지원이면 무시될 수 있음)
      stream: options.stream ?? false,
    };

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

    const clovaSchema = z.object({
      result: z
        .object({
          message: messageSchema.optional(),
          usage: usageSchema.optional(),
        })
        .optional(),
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

    // Be tolerant to schema drift: log mismatch but do not throw.
    const parsed = clovaSchema.safeParse(parsedJson);
    if (!parsed.success) {
      try {
        const issues = parsed.error.issues?.slice?.(0, 5);
        this.logger.warn(
          `CLOVA schema mismatch (proceeding with raw). req=${requestId} ct=${contentType} preview=${rawText
            .replace(/\s+/g, ' ')
            .slice(0, 200)}`,
        );
        if (process.env.CLOVA_SCHEMA_DEBUG === '1') {
          this.logger.warn(`CLOVA schema issues: ${JSON.stringify(issues)}`);
        }
      } catch {}
    }

    const json = parsed.success ? parsed.data : (parsedJson as any);

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
    return { requestId, content, raw: json };
  }
}
