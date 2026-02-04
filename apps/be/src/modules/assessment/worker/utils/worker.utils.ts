import { AssessmentStatus } from '@prisma/client';

import type { AssessmentSseEventDTO } from '../../dto/assessment-sse-event.dto';
import type { Job } from 'bullmq';

// 공통: 진행상태를 업데이트하여 SSE 전송에 활용
export async function updateProgress<T>(job: Job<T>, payload: AssessmentSseEventDTO) {
  await job.updateProgress(payload);
}

// 공통: jobId 생성 규칙
export function jobIdRoot(answerId: number) {
  return `answer-${answerId}`;
}

export type AssessStage = 'evaluate' | 'feedback' | 'reward';

export function jobIdStage(answerId: number, stage: AssessStage) {
  return `${jobIdRoot(answerId)}:${stage}`;
}

// 안전한 enum 접근: 존재하지 않으면 fallback 반환
export function getAssessmentStatus(name: string, fallback: AssessmentStatus): AssessmentStatus {
  const rec = AssessmentStatus as unknown as Record<string, AssessmentStatus>;
  return rec[name] ?? fallback;
}
