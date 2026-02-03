import { z } from 'zod';

// 평가 제출 응답 스키마(202 Accepted)
export const AssessResponseSchema = z.object({
  jobId: z.number().int().positive(),
  answerId: z.number().int().positive(),
  status: z.string(),
});
