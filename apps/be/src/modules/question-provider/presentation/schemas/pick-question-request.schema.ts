import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { z } from 'zod';

export const PickQuestionRequestSchema = z.object({
  domain: z.enum(Object.values(Domain) as [Domain, ...Domain[]]),
  difficulty: z.enum(Object.values(Difficulty) as [Difficulty, ...Difficulty[]]),
});

export type PickQuestionRequestDto = z.infer<typeof PickQuestionRequestSchema>;
