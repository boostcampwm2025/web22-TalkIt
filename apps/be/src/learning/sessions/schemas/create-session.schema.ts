import { LearningCategory } from '@/common/enums/learning-category.enum';
import { LearningDifficulty } from '@/common/enums/learning-difficulty.enum';

import { z } from 'zod';

export const CreateSessionSchema = z.object({
  category: z.enum(Object.values(LearningCategory) as [LearningCategory, ...LearningCategory[]]),
  difficulty: z.enum(
    Object.values(LearningDifficulty) as [LearningDifficulty, ...LearningDifficulty[]],
  ),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
