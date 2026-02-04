import type { Nullable } from '@/types/utils';
import type { AssessmentStatus } from '@repo/shared/constants/learning';
import type {
  CreateQuestionResponseDTO,
  GetFeedbackResponseDTO,
} from '@repo/shared/types/learning';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const ANSWER_PHASE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  STT_LOADING: 'stt-loading',
  STT_DONE: 'stt-done',
  FEEDBACK_LOADING: 'feedback-loading',
  FEEDBACK_DONE: 'feedback-done',
} as const;

export type AnswerPhase = (typeof ANSWER_PHASE)[keyof typeof ANSWER_PHASE];

type AnswerState = {
  sttText: string | null;
  recordingTime: number;
  answerId: number | null;
};

type FeedbackState = {
  data: GetFeedbackResponseDTO | null;
  assessmentStatus: AssessmentStatus | null;
};

type LearningSessionState = Nullable<CreateQuestionResponseDTO> & {
  phase: AnswerPhase;
  answer: AnswerState;
  feedback: FeedbackState;
};

type LearningSessionActions = {
  setQuestion: (state: CreateQuestionResponseDTO) => void;
  resetQuestion: () => void;
  setRemainedCredit: (credit: number) => void;

  setPhase: (phase: AnswerPhase) => void;

  setSttText: (text: string) => void;
  setRecordingTime: (time: number) => void;
  setAnswerId: (id: number) => void;

  setFeedback: (feedback: GetFeedbackResponseDTO) => void;
  setAssessmentStatus: (status: AssessmentStatus) => void;

  resetAnswerFlow: () => void;
};

type LearningSessionStore = LearningSessionState & LearningSessionActions;

const initialAnswerState: AnswerState = {
  sttText: null,
  recordingTime: 0,
  answerId: null,
};

const initialFeedbackState: FeedbackState = {
  data: null,
  assessmentStatus: null,
};

const initialLearningSessionState: LearningSessionState = {
  sessionId: null,
  currentQuestionCount: null,
  remainedCredit: null,
  question: null,
  phase: ANSWER_PHASE.IDLE,
  answer: initialAnswerState,
  feedback: initialFeedbackState,
};

const useLearningSession = create<LearningSessionStore>()(
  persist(
    (set) => ({
      ...initialLearningSessionState,

      setQuestion: (state: CreateQuestionResponseDTO) => set(() => ({ ...state })),
      resetQuestion: () => set(() => ({ ...initialLearningSessionState })),
      setRemainedCredit: (credit: number) => set(() => ({ remainedCredit: credit })),

      setPhase: (phase: AnswerPhase) => set(() => ({ phase })),

      setSttText: (text: string) =>
        set((state) => ({ answer: { ...state.answer, sttText: text } })),
      setRecordingTime: (time: number) =>
        set((state) => ({ answer: { ...state.answer, recordingTime: time } })),
      setAnswerId: (id: number) => set((state) => ({ answer: { ...state.answer, answerId: id } })),

      setFeedback: (feedback: GetFeedbackResponseDTO) =>
        set((state) => ({ feedback: { ...state.feedback, data: feedback } })),
      setAssessmentStatus: (status: AssessmentStatus) =>
        set((state) => ({ feedback: { ...state.feedback, assessmentStatus: status } })),

      resetAnswerFlow: () =>
        set(() => ({
          phase: ANSWER_PHASE.IDLE,
          answer: initialAnswerState,
          feedback: initialFeedbackState,
        })),
    }),
    {
      name: 'learning-session-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const { phase } = state;

        // recording, stt-loading: 녹음/음성인식은 재개 불가 → 안전한 상태로 보정
        if (phase === ANSWER_PHASE.RECORDING || phase === ANSWER_PHASE.STT_LOADING) {
          state.phase = state.answer.sttText ? ANSWER_PHASE.STT_DONE : ANSWER_PHASE.IDLE;
        }

        // feedback-loading: phase와 answerId가 유지되므로
        // useAssessmentStream 훅이 자동으로 SSE 재연결 → 별도 보정 불필요
      },
    },
  ),
);

export default useLearningSession;
