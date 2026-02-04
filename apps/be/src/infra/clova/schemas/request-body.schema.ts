// CLOVA 요청 바디 스키마
// - 문서 스펙에 맞춘 필드/범위 검증 및 타입 제공(서비스 입력 검증에 활용 가능)
import { z } from 'zod';

// TypeScript type for the supported JSON Schema subset
// Keep in sync with jsonSchemaSubsetSchema below.
export type JsonSchemaSubset = {
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'integer'
    | 'object'
    | 'array'
    | readonly ['string', 'null'];
  format?:
    | 'date-time'
    | 'date'
    | 'time'
    | 'duration'
    | 'email'
    | 'hostname'
    | 'ipv4'
    | 'ipv6'
    | 'uuid';
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchemaSubset;
  properties?: Record<string, JsonSchemaSubset>;
  required?: string[];
  enum?: Array<string | number | boolean>;
  anyOf?: JsonSchemaSubset[];
  additionalProperties?: boolean;
  // Some usages allow union type for type value like ['string','null']
  // We model a minimal allowance above; additionalProperties is not supported in this subset.
};

// 요청용 메시지 스키마(역할/내용)
// - role: system(규칙/지시), user(사용자 발화/질문), assistant(모델 답변)
// - content: 텍스트 입력(String)
export const chatMessageSchema = z
  .object({
    role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]),
    content: z.string(),
  })
  .strict();

// thinking 설정(effort 단계 지원)
export const thinkingSchema = z
  .object({
    effort: z.enum(['none', 'low', 'medium', 'high']).optional(),
  })
  .strict();

// 지원되는 JSON Schema 서브셋(재귀)
// - type: string|number|boolean|integer|object|array
// - string: format(정의된 형식)
// - number/integer: minimum/maximum
// - array: minItems/maxItems/items
// - object: properties(required 포함)
// - enum(any of string|number|boolean), anyOf(스키마 배열)
// - pattern 미지원(어떤 깊이에서도 허용 안 함)
const formats = z.enum([
  'date-time',
  'date',
  'time',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

// 타입 별칭은 하단에 export로만 노출(중복 정의 방지)

function assertNoPatternDeep(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return true;
  if (Object.prototype.hasOwnProperty.call(obj as any, 'pattern')) return false;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (!assertNoPatternDeep(v)) return false;
  }
  return true;
}

export const jsonSchemaSubsetSchema: z.ZodType<JsonSchemaSubset> = z.lazy(() =>
  z
    .object({
      type: z
        .union([
          z.enum(['string', 'number', 'boolean', 'integer', 'object', 'array']),
          z.tuple([z.literal('string'), z.literal('null')]),
        ])
        .optional(),
      format: formats.optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      minItems: z.number().int().min(0).optional(),
      maxItems: z.number().int().min(0).optional(),
      items: z.lazy(() => jsonSchemaSubsetSchema).optional(),
      properties: z
        .record(
          z.string(),
          z.lazy(() => jsonSchemaSubsetSchema),
        )
        .optional(),
      required: z.array(z.string()).optional(),
      enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
      anyOf: z.array(z.lazy(() => jsonSchemaSubsetSchema)).optional(),
      additionalProperties: z.boolean().optional(),
    })
    .strict()
    .refine(assertNoPatternDeep, {
      message: 'pattern keyword is not supported in Structured Outputs schema',
    }),
);

// Structured Outputs(JSON) 설정
export const responseFormatSchema = z
  .object({
    type: z.literal('json'),
    schema: jsonSchemaSubsetSchema, // 지원 서브셋으로 제한
  })
  .strict();

// 전체 요청 바디 스키마
export const clovaRequestBodySchema = z
  .object({
    messages: z.array(chatMessageSchema),
    // 스트리밍 여부(서비스 어댑터에서 기본 제어)
    stream: z.boolean().optional(),
    topP: z.number().gt(0).lte(1).optional(),
    topK: z.number().int().min(0).max(128).optional(),
    maxCompletionTokens: z.number().int().gt(0).lte(32768).optional(),
    temperature: z.number().min(0).max(1).optional(),
    repetitionPenalty: z.number().gt(0).lte(2.0).optional(),
    stop: z.array(z.string()).optional(),
    seed: z.number().int().min(0).max(4294967295).optional(),
    thinking: thinkingSchema.optional(), // SO와 동시 사용 불가(서비스 레벨에서 상호배타 보장)
    responseFormat: responseFormatSchema.optional(),
    includeAiFilters: z.boolean().optional(),
  })
  .strict();

// 추가 제약
// - messages 내 system 역할은 최대 1개
// - thinking과 responseFormat은 상호배타(서비스에서도 보장하지만 스키마에서 재확인)
export const clovaRequestBodyWithRulesSchema = clovaRequestBodySchema.superRefine((val, ctx) => {
  try {
    const systemCount = (val.messages ?? []).filter((m) => m.role === 'system').length;
    if (systemCount > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'messages: only one system role is allowed per request',
        path: ['messages'],
      });
    }
    if (val.responseFormat && val.thinking) {
      ctx.addIssue({
        code: 'custom',
        message: 'responseFormat and thinking cannot be used together',
        path: ['responseFormat'],
      });
    }
  } catch {
    /* ignore errors */
  }
});

export type ClovaChatRequest = z.infer<typeof clovaRequestBodySchema>;
