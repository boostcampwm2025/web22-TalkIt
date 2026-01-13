import { HttpException, Injectable } from '@nestjs/common';
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
      content: z.string().optional(),
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

    const safe = clovaSchema.safeParse(parsedJson);
    if (!safe.success) {
      throw new HttpException(
        {
          statusCode: res.status,
          message: 'CLOVA response validation failed',
          requestId,
          contentType,
          rawTextPreview: rawText.slice(0, 500),
          issues: safe.error.issues,
        },
        res.ok ? 500 : res.status,
      );
    }

    const json = safe.data;

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

    const content = json.result?.message?.content;
    return { requestId, content, raw: json };
  }
}
