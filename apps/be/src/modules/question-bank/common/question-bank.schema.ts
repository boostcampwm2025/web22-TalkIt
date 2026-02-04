import { z } from 'zod';

/** LLM이 생성한 개별 질문 항목 스키마 */
export const LlmQuestionItemSchema = z.object({
  term: z.string().optional(),
  depth: z.number().int().min(1).max(3),
  keywords: z.array(z.string()),
  content: z.string().min(1),
});

/** LLM 응답에서 파싱한 질문 배열 스키마 */
export const LlmQuestionArraySchema = z.array(LlmQuestionItemSchema);

/** 중복 검사 LLM 응답의 개별 항목 스키마 */
export const DuplicateEntrySchema = z.object({
  keep: z.number().int().min(1),
  remove: z.number().int().min(1),
  reason: z.string().optional().default(''),
});

/** 중복 검사 LLM 응답 전체 스키마 */
export const DedupResponseSchema = z.object({
  duplicates: z.array(DuplicateEntrySchema),
});

export type LlmQuestionItem = z.infer<typeof LlmQuestionItemSchema>;
export type DuplicateEntry = z.infer<typeof DuplicateEntrySchema>;
export type DedupResponse = z.infer<typeof DedupResponseSchema>;
