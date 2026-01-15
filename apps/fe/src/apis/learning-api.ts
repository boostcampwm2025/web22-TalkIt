import type { QuestionCategory, QuestionDifficulty } from '@repo/shared/constants/learning';
import type { CreateQuestionResponseDTO } from '@repo/shared/types/learning';

import axiosInstance from './http';

// 세션 생성 API
export const learningApi = {
  startSession: async (category: QuestionCategory, difficulty: QuestionDifficulty) => {
    const { data } = await axiosInstance.post<CreateQuestionResponseDTO>('/learning/sessions', {
      category,
      difficulty,
    });
    return data;
  },
};
