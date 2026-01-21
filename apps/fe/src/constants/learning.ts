import { QUESTION_CATEGORY, QUESTION_DIFFICULTY } from '@repo/shared/constants/learning';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

// Note: 세션 종료 API 구현 시 제거
export const DUMMY_RESULT_DATA: FinishSessionResponseDTO = {
  currentXp: 200,
  prevRequiredXpForNextLevel: 1500,
  requiredXpForNextLevel: 1600,
  level: 15,
  gainedXp: {
    baseXp: 500,
    difficultyBonus: 100,
    deepDiveBonus: 50,
  },
  category: QUESTION_CATEGORY['OS'],
  difficulty: QUESTION_DIFFICULTY['EASY'],
  questions: [
    { content: 'OSI 7 Layers', type: 'NORMAL', score: 80 },
    { content: 'DS: Linked List', type: 'NORMAL', score: 70 },
    { content: 'OS: Process vs Thread', type: 'TAIL', score: 80 },
  ],
};
