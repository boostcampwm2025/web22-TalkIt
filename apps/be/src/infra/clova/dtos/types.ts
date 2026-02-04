import type { JsonSchemaSubset } from '../schemas/request-body.schema';

// CLOVA 서비스에서 사용하는 입력/출력 타입 정의
// - 외부 모듈이 의존할 수 있는 최소 타입 표면 제공(느슨한 결합 유지)
export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = { role: ChatRole; content: string };

export type ThinkingEffort = 'none' | 'low' | 'medium' | 'high';

export type JsonResponseFormat = { type: 'json'; schema: JsonSchemaSubset };

export type ChatOptions = {
  maxCompletionTokens?: number;
  temperature?: number;
  thinking?: { effort: ThinkingEffort };
  stream?: boolean;
  responseFormat?: JsonResponseFormat;
  noThinking?: boolean;
};

export type ChatResult = { requestId: string; content: string; raw: unknown };
