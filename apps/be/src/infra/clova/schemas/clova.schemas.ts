// CLOVA 응답 스키마(zod)
// - status/result/usage 구조를 관대하게 검증하여 호환성 유지
import { z } from 'zod';

export const usageSchema = z
  .object({
    outputTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    tokens: z.number().optional(),
  })
  .partial();

export const messageSchema = z.object({
  role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant')]).optional(),
  content: z.any().optional(),
});

export const clovaSchema = z.object({
  status: z
    .object({
      // ErrorEvent 문서상 code/message가 object로 올 수 있으므로 관대하게 수용
      code: z.unknown().optional(),
      message: z.unknown().optional(),
    })
    .optional(),
  result: z.any().nullable().optional(),
  usage: usageSchema.optional(),
});

export type ClovaResponse = z.infer<typeof clovaSchema>;
