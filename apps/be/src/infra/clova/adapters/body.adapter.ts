// CLOVA 요청 바디 어댑터
// - Thinking 모드 / Structured Output(JSON) 모드별 바디 생성 전략 분리
import type { ChatMessage, ChatOptions, ThinkingEffort } from '../dtos/types';
import type { ChatRequestBody } from '../utils/request';

export interface BodyAdapter {
  build(messages: ChatMessage[], options: ChatOptions): ChatRequestBody;
}

export class StructuredOutputBodyAdapter implements BodyAdapter {
  build(messages: ChatMessage[], options: ChatOptions): ChatRequestBody {
    return {
      messages,
      // SO(JSON) 모드: 추론 길이 권장값이 아닌 고정치 사용(서비스 정책에 맞게 조정 가능)
      maxCompletionTokens: options.maxCompletionTokens ?? 3000,
      temperature: options.temperature ?? 0.2,
      // SO 모드에서는 기본 스트림 off
      stream: options.stream ?? false,
      // SO(JSON) 모드: thinking 기본값은 none(미지정 시 low 적용 충돌 방지)
      thinking: { effort: 'none' },
      responseFormat: { type: 'json', schema: options.responseFormat!.schema },
    };
  }
}

export class ThinkingBodyAdapter implements BodyAdapter {
  build(messages: ChatMessage[], options: ChatOptions): ChatRequestBody {
    // 권장안 반영: thinking 기본값 low, effort별 기본 maxCompletionTokens
    const effort: ThinkingEffort = options.thinking?.effort ?? 'low';
    const defaultMaxTokensByEffort: Record<ThinkingEffort, number> = {
      none: 512,
      low: 5120,
      medium: 10240,
      high: 20480,
    };
    // 스트리밍 비활성화 기본(요구사항: 현재 스트리밍 처리 불필요)
    const defaultStream = false;
    return {
      messages,
      maxCompletionTokens: options.maxCompletionTokens ?? defaultMaxTokensByEffort[effort],
      temperature: options.temperature ?? 0.2,
      stream: options.stream ?? defaultStream,
      thinking: { effort },
    };
  }
}

export function selectBodyAdapter(options: ChatOptions): BodyAdapter {
  if (options.responseFormat?.type === 'json') return new StructuredOutputBodyAdapter();
  return new ThinkingBodyAdapter();
}
