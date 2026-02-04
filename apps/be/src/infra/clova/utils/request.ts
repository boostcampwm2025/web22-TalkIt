// CLOVA 요청 유틸리티
// - URL/헤더/바디 생성과 요청 ID 생성 등 공통 로직 캡슐화
// - Thinking과 Structured Output(JSON)은 상호배타적으로 처리(어댑터 선택으로 보장)
import { selectBodyAdapter } from '../adapters/body.adapter';
import type { ChatMessage, ChatOptions, ThinkingEffort } from '../dtos/types';

export type ChatRequestBody = {
  messages: ChatMessage[];
  maxCompletionTokens: number;
  temperature: number;
  stream: boolean;
  thinking?: { effort: ThinkingEffort };
  responseFormat?: NonNullable<ChatOptions['responseFormat']>;
};

export function makeChatUrl(baseUrl: string, model: string): string {
  return `${baseUrl}/v3/chat-completions/${model}`;
}

export function generateRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function makeHeaders(apiKey: string, requestId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId,
  };
}

export function buildChatRequestBody(
  messages: ChatMessage[],
  options: ChatOptions = {},
): ChatRequestBody {
  const adapter = selectBodyAdapter(options);
  // noThinking 옵션이 명시되면 thinking 파라미터를 강제로 제거하기 위해 후처리
  const built = adapter.build(messages, options);
  const copy: ChatRequestBody = { ...built };
  // 강제 상호배타 보장: responseFormat 존재 시 thinking 제거
  if (copy.responseFormat && (copy as any).thinking) {
    delete (copy as any).thinking;
  }
  // 호출부가 명시적으로 noThinking을 요청한 경우에도 제거
  if (options.noThinking && (copy as any).thinking) {
    delete (copy as any).thinking;
  }
  return copy;
}
