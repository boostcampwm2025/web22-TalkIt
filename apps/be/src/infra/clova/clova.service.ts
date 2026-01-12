import { HttpException, Injectable } from '@nestjs/common';

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
  private readonly baseUrl = process.env.CLOVA_BASE_URL!;
  private readonly model = process.env.CLOVA_MODEL ?? 'HCX-007';
  private readonly apiKey = process.env.CLOVA_API_KEY!;

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
    const rawText = await res.text(); // ✅ 먼저 text로 받기

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      throw new HttpException(
        {
          statusCode: res.status,
          message: 'CLOVA response parse failed',
          requestId,
          contentType,
          rawTextPreview: rawText.slice(0, 500),
        },
        res.ok ? 500 : res.status,
      );
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

    const content = json?.result?.message?.content; // v3 Thinking 최종 답 :contentReference[oaicite:2]{index=2}
    return { requestId, content, raw: json };
  }
}
