import { z } from 'zod';

export const RecordSessionAnswerSchema = z
  .object({
    questionId: z.coerce.number().optional(),
    extraQuestionId: z.coerce.number().optional(),
  })
  .refine(
    (data) =>
      (data.questionId && !data.extraQuestionId) || (!data.questionId && data.extraQuestionId),
    {
      message: 'questionId 또는 extraQuestionId 중 하나만 제공해야 합니다.',
      path: ['questionId'],
    },
  );

export type RecordSessionAnswerDto = z.infer<typeof RecordSessionAnswerSchema>;
