import type { AssessmentSseEventDTO } from '../dto/assessment-sse-event.dto';

// BullMQ QueueEvents에서 사용하는 이벤트 타입 정의
export type QueueProgressEvent = {
  type: 'progress';
  jobId: string;
  data: AssessmentSseEventDTO;
};

export type QueueCompletedEvent = {
  type: 'completed';
  jobId: string;
  data: unknown;
};

export type QueueFailedEvent = {
  type: 'failed';
  jobId: string;
  error: string;
};

export type AssessmentQueueEvent = QueueProgressEvent | QueueCompletedEvent | QueueFailedEvent;
