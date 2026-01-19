import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

// Note: 세션 종료 API 구현 시 제거
export const DUMMY_RESULT_DATA: FinishSessionResponseDTO = {
  currentXp: 1200,
  requiredXp: 1600,
  level: 15,
  gainedXp: 280,
  question: ['OSI 7 Layers', 'DS: Linked List', 'OS: Process vs Thread'],
};
