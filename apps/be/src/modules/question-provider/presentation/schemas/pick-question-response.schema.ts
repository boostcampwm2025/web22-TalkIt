import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { z } from 'zod';

export const PickQuestionResponseSchema = z.object({
  questionId: z.union([z.number(), z.string()]),
  domain: z.enum(Object.values(Domain) as [Domain, ...Domain[]]),
  difficulty: z.enum(Object.values(Difficulty) as [Difficulty, ...Difficulty[]]),
  topicId: z.string(),
  content: z.string(),
  mustInclude: z.array(z.string()),
  timeLimitSec: z.number(),
});

export type PickQuestionResponseDto = z.infer<typeof PickQuestionResponseSchema>;
