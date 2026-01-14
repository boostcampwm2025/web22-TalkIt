import type { Nullable } from '@/types/utils';
import type { CreateQuestionResponseDTO } from '@repo/shared/types/learning';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type LearningSessionState = Nullable<CreateQuestionResponseDTO>;

type LearningSessionActions = {
  setQuestion: (state: CreateQuestionResponseDTO) => void;
  resetQuestion: () => void;
};
type LearningSessionStore = LearningSessionState & LearningSessionActions;

const initialLearningSessionState: LearningSessionState = {
  sessionId: null,
  currentQuestionCount: null,
  remainedCredit: null,
  question: null,
};

const useLearningSession = create<LearningSessionStore>()(
  persist(
    (set) => ({
      ...initialLearningSessionState,
      setQuestion: (state: CreateQuestionResponseDTO) => set(() => ({ ...state })),
      resetQuestion: () => set(() => ({ ...initialLearningSessionState })),
    }),
    {
      name: 'question-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export default useLearningSession;
