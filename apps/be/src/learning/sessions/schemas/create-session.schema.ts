import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { z } from 'zod';

export const CreateSessionSchema = z.object({
  category: z.enum(Object.values(Domain) as [Domain, ...Domain[]]),
  difficulty: z.enum(Object.values(Difficulty) as [Difficulty, ...Difficulty[]]),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
