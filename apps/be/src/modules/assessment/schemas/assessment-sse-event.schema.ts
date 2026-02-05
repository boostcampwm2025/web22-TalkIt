import { AssessmentStatus } from '@prisma/client';
import type { AssessmentStatus as AssessmentStatusType } from '@prisma/client';

import { z } from 'zod';

// SSE로 전송되는 평가 작업 진행 이벤트 페이로드
// - worker와 컨트롤러가 공유하는 합의된 형태
// Prisma enum 값을 기반으로 z.enum에 전달할 튜플을 동적으로 구성합니다.
const assessmentStatusValues = Object.values(AssessmentStatus) as [
  AssessmentStatusType,
  ...AssessmentStatusType[],
];

export const AssessmentSseEventSchema = z.object({
  jobId: z.number().int(),
  answerId: z.number().int(),
  status: z.enum(assessmentStatusValues),
  timestamp: z.string(),
  error: z.string().nullable().optional(),
});
