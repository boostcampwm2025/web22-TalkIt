// CLOVA 응답 바디 스키마(정밀)
// - 문서 스펙 기반의 status/result/usage/message/aiFilter 구조와 제약 정의
import { z } from 'zod';

// 공통 enum
export const chatRoleEnum = z.enum(['system', 'user', 'assistant']);
export const finishReasonEnum = z
  .enum(['length', 'stop', 'tool_calls'])
  .or(z.literal('tool_calls'));
export const aiFilterGroupEnum = z.enum(['curse', 'unsafeContents']);
export const aiFilterNameEnum = z.enum(['discrimination', 'insult', 'sexualHarassment']);
export const aiFilterScoreEnum = z.enum(['-1', '0', '1', '2']);
export const aiFilterResultEnum = z.enum(['OK', 'ERROR']);

// status
export const responseStatusSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

// result.message
export const responseMessageSchema = z
  .object({
    role: chatRoleEnum,
    content: z.string(),
    // 추론 사용 시 모델의 사고과정(개발용): 사용자에게 그대로 노출 지양
    thinkingContent: z.string().optional(),
  })
  .strict();

// result.usage
export const responseUsageSchema = z
  .object({
    completionTokens: z.number().int().optional(),
    promptTokens: z.number().int().optional(),
    totalTokens: z.number().int().optional(),
    // 추론 토큰 상세(옵션)
    completionTokensDetails: z
      .object({
        thinkingTokens: z.number().int().optional(),
      })
      .partial()
      .optional(),
  })
  .strict();

// result.aiFilter[*]
export const aiFilterItemSchema = z
  .object({
    groupName: aiFilterGroupEnum,
    name: aiFilterNameEnum,
    score: aiFilterScoreEnum,
    result: aiFilterResultEnum,
  })
  .strict();

export const responseResultSchema = z
  .object({
    created: z.number().int().optional(), // unix ts ms
    usage: responseUsageSchema.optional(),
    message: responseMessageSchema.optional(),
    finishReason: finishReasonEnum.optional(),
    seed: z.number().int().optional(),
    aiFilter: z.array(aiFilterItemSchema).optional(),
  })
  .strict();

// 최상위 응답
export const clovaResponseBodySchema = z
  .object({
    status: responseStatusSchema.optional(),
    result: responseResultSchema.optional(),
  })
  .strict();

export type ClovaChatResponse = z.infer<typeof clovaResponseBodySchema>;
