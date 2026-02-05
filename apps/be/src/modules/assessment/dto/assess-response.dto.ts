import { AssessResponseSchema } from '../schemas/assess-response.schema';
import { z } from 'zod';

export type AssessResponseDTO = z.infer<typeof AssessResponseSchema>;
