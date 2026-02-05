import { GetFeedbackResponseSchema } from '../schemas/get-feedback-response.schema';
import { z } from 'zod';

export type GetFeedbackResponseDTO = z.infer<typeof GetFeedbackResponseSchema>;
