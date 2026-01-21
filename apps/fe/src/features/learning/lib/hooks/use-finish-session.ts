import { useState } from 'react';

import { finishSessionApi } from '@/apis/learning-api';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

export const useFinishSession = () => {
  const [isLoading, setIsLoading] = useState(false);

  const finishSession = async (sessionId: number): Promise<FinishSessionResponseDTO> => {
    setIsLoading(true);
    try {
      const data = await finishSessionApi({ sessionId });
      return data;
    } catch (error) {
      console.error('Error finishing session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { finishSession, isLoading };
};
