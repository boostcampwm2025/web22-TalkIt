import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

import type { AssessmentStatus } from '@repo/shared/constants/learning';
import type { GetFeedbackResponseDTO } from '@repo/shared/types/learning';

export const ANSWER_PHASE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  STT_LOADING: 'stt-loading',
  STT_DONE: 'stt-done',
  FEEDBACK_LOADING: 'feedback-loading',
  FEEDBACK_DONE: 'feedback-done',
} as const;

export type AnswerPhase = (typeof ANSWER_PHASE)[keyof typeof ANSWER_PHASE];

type AnswerFlowState = {
  phase: AnswerPhase;
  sttText: string | null;
  feedback: GetFeedbackResponseDTO | null;
  assessmentStatus: AssessmentStatus | null;
  answerId: number | null;
  recordingTime: number;
};

type AnswerFlowActions = {
  setPhase: (phase: AnswerPhase) => void;
  setSttText: (text: string) => void;
  setFeedback: (feedback: GetFeedbackResponseDTO) => void;
  setAssessmentStatus: (status: AssessmentStatus) => void;
  setAnswerId: (id: number) => void;
  setRecordingTime: (time: number) => void;
  reset: () => void;
};

type AnswerFlowContextType = AnswerFlowState & AnswerFlowActions;

const initialState: AnswerFlowState = {
  phase: ANSWER_PHASE.IDLE,
  sttText: null,
  feedback: null,
  assessmentStatus: null,
  answerId: null,
  recordingTime: 0,
};

const AnswerFlowContext = createContext<AnswerFlowContextType | null>(null);

type AnswerFlowProviderProps = {
  children: ReactNode;
};

export const AnswerFlowProvider = ({ children }: AnswerFlowProviderProps) => {
  const [state, setState] = useState<AnswerFlowState>(initialState);

  const setPhase = useCallback((phase: AnswerPhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const setSttText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, sttText: text }));
  }, []);

  const setFeedback = useCallback((feedback: GetFeedbackResponseDTO) => {
    setState((prev) => ({ ...prev, feedback }));
  }, []);

  const setAssessmentStatus = useCallback((status: AssessmentStatus) => {
    setState((prev) => ({ ...prev, assessmentStatus: status }));
  }, []);

  const setAnswerId = useCallback((id: number) => {
    setState((prev) => ({ ...prev, answerId: id }));
  }, []);

  const setRecordingTime = useCallback((time: number) => {
    setState((prev) => ({ ...prev, recordingTime: time }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <AnswerFlowContext.Provider
      value={{
        ...state,
        setPhase,
        setSttText,
        setFeedback,
        setAssessmentStatus,
        setAnswerId,
        setRecordingTime,
        reset,
      }}
    >
      {children}
    </AnswerFlowContext.Provider>
  );
};

export const useAnswerFlow = (): AnswerFlowContextType => {
  const context = useContext(AnswerFlowContext);
  if (!context) {
    throw new Error('useAnswerFlow must be used within an AnswerFlowProvider');
  }
  return context;
};
