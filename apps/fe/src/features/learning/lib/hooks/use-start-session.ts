import { useState } from 'react';

import { learningApi } from '@/apis/learning-api';
import useLearningSession from '@/lib/stores/learning-session';
import type { QuestionCategory, QuestionDifficulty } from '@repo/shared/constants/learning';
import { useNavigate } from '@tanstack/react-router';

export const useStartSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const setQuestion = useLearningSession((state) => state.setQuestion);

  const startSession = async (category: QuestionCategory, difficulty: QuestionDifficulty) => {
    setIsLoading(true);
    try {
      const data = await learningApi.startSession(category, difficulty);
      setQuestion(data);

      await navigate({ to: '/learning/question' });

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
