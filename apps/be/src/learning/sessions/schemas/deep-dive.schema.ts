import { z } from 'zod';

export const DeepDiveRequestSchema = z.object({
  answerId: z.number().int().positive(),
});

export type DeepDiveRequestDto = z.infer<typeof DeepDiveRequestSchema>;
