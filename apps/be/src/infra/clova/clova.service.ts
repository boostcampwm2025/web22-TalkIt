import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ThinkingEffort = 'none' | 'low' | 'medium' | 'high';

type ChatOptions = {
  maxCompletionTokens?: number;
  temperature?: number;
  stream?: boolean;
  apiKey?: string;
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
    const url = `${this.baseUrl}/v1/chat-completions/${this.model}`;
    const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    const clampTemp = (t?: number) => {
      if (typeof t !== 'number' || Number.isNaN(t)) return 0.5;
      return Math.min(1, Math.max(0.01, t));
    };

    const body = {
      messages,
      maxTokens: options.maxCompletionTokens ?? 400,
      temperature: clampTemp(options.temperature),
      topK: 0,
      topP: 0.8,
      repeatPenalty: 5.0,
      stopBefore: [],
      includeAiFilters: true,
    };

    const apiKey = options.apiKey ?? this.apiKey;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId,
        ...(options.stream ? { Accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify(body),
    });

    if ((process.env.CLOVA_RATE_LOG ?? '').trim() === '1') {
      const pick = (name: string) => res.headers.get(name) ?? res.headers.get(name.toLowerCase());
      const rateInfo = {
        requestId,
        limitRequests: pick('x-ratelimit-limit-requests'),
        remainingRequests: pick('x-ratelimit-remaining-requests'),
        resetRequests: pick('x-ratelimit-reset-requests'),
        limitTokens: pick('x-ratelimit-limit-tokens'),
        remainingTokens: pick('x-ratelimit-remaining-tokens'),
        resetTokens: pick('x-ratelimit-reset-tokens'),
      };
      console.log('[CLOVA RATE]', rateInfo);
    }

    const contentType = res.headers.get('content-type') ?? '';
    const rawText = await res.text();

    if (!rawText) {
      throw new HttpException(
        {
          statusCode: 502,
          message: 'Empty CLOVA response',
          requestId,
        },
        502,
      );
    }

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      throw new HttpException(
        {
          statusCode: 502,
          message: 'CLOVA response is not valid JSON',
          requestId,
          contentType,
          rawTextPreview: rawText.slice(0, 500),
        },
        502,
      );
    }

    // 최상위 형태 가드
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      throw new HttpException(
        {
          statusCode: 502,
          message: 'Invalid CLOVA response shape',
          requestId,
          rawTextPreview: rawText.slice(0, 500),
        },
        502,
      );
    }

    // HTTP 성공이지만 논리 실패
    const clovaStatus = json?.status?.code?.toString();
    if (clovaStatus && clovaStatus !== '20000') {
      console.warn('[CLOVA WARNING]', {
        clovaStatus,
        message: json?.status?.message,
        requestId,
      });
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

    // content 추출 (문자열 / 배열 대응)
    const contentRaw =
      json?.result?.message?.content ??
      json?.result?.messages?.[0]?.content ??
      json?.choices?.[0]?.message?.content;

    let content: string | undefined;

    if (typeof contentRaw === 'string') {
      content = contentRaw;
    } else if (Array.isArray(contentRaw)) {
      content = contentRaw.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('');
    }

    if (!content) {
      throw new HttpException(
        {
          statusCode: 502,
          message: 'CLOVA response has no content',
          finishReason: json?.result?.finishReason ?? json?.result?.stopReason,
          requestId,
        },
        502,
      );
    }

    return {
      requestId,
      content,
      raw: json, // 디버깅용
    };
  }
}
