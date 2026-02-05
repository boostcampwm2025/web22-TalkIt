import { AssessmentSseEventSchema } from '../schemas/assessment-sse-event.schema';
import type { z } from 'zod';

export type AssessmentSseEventDTO = z.infer<typeof AssessmentSseEventSchema>;
