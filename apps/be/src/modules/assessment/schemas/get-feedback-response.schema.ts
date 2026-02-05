import { z } from 'zod';

// 평가 스냅샷 응답 스키마(200 OK)
export const GetFeedbackResponseSchema = z.object({
  answerId: z.number().int().positive(),
  question: z.string(),
  answer: z.string(),
  overallScore: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
  xp: z.number().int().nonnegative(),
  remainingToken: z.number().int().nonnegative(),
});
