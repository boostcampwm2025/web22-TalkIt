import { z } from 'zod';

export const AssessRequestSchema = z
  .object({
    questionId: z.number().optional(),
    extraQuestionId: z.number().optional(),
    answerText: z.string().min(1),
    timeSpentSec: z.number().int().min(0),
  })
  .refine(
    (data) =>
      (data.questionId && !data.extraQuestionId) || (!data.questionId && data.extraQuestionId),
    {
      message: 'questionId 또는 extraQuestionId 중 하나만 제공해야 합니다.',
      path: ['questionId'],
    },
  );

export type AssessRequestDto = z.infer<typeof AssessRequestSchema>;
