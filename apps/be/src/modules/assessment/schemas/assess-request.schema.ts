import { z } from 'zod';

export const AssessRequestSchema = z.object({
  questionId: z.number().int().positive(),
  answerText: z.string().min(1),
  timeSpentSec: z.number().int().min(0),
});

export type AssessRequestDto = z.infer<typeof AssessRequestSchema>;
