import { useState } from 'react';

import { learningApi } from '@/apis/learning-api';
import type { QuestionCategory, QuestionDifficulty } from '@repo/shared/constants/learning';

export const useStartSession = () => {
  const [isLoading, setIsLoading] = useState(false);

  const startSession = async (category: QuestionCategory, difficulty: QuestionDifficulty) => {
    setIsLoading(true);
    try {
      const data = await learningApi.startSession(category, difficulty);
      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { startSession, isLoading };
};
