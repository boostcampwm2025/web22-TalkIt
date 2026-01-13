import type { Question } from '@repo/shared/types/study';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type QuestionState = {
  sessionId: number | null;
  question: Question | null;
};
type QuestionActions = {
  setQuestion: (state: QuestionState) => void;
  resetQuestion: () => void;
};
type QuestionStore = QuestionState & QuestionActions;

const useQuestion = create<QuestionStore>()(
  persist(
    (set) => ({
      sessionId: null,
      question: null,
      setQuestion: (state: QuestionState) => set(() => ({ ...state })),
      resetQuestion: () => set(() => ({ sessionId: null, question: null })),
    }),
    {
      name: 'question-storage',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export default useQuestion;
