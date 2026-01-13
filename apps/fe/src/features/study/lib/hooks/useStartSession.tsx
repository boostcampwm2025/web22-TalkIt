import { useState } from 'react';

import type { QuestionDifficulty, QuestionTopic } from '../../types/QuestionOptions';

export const useStartSession = () => {
  const [isLoading, setIsLoading] = useState(false);

  const startSession = async (topic: QuestionTopic, difficulty: QuestionDifficulty) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        topic,
        difficulty,
      }).toString();

      const response = await fetch(`/api/learning/sessions?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('세션 생성에 실패했습니다.');
      }

      const data = await response.json();
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
