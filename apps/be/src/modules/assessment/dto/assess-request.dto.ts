import { AssessRequestSchema } from '../schemas/assess-request.schema';
import { z } from 'zod';

// 요청 DTO는 스키마 기반으로 추론하여 중복 및 불일치 방지
export type AssessRequestDto = z.infer<typeof AssessRequestSchema>;
