import { useRef, useState } from 'react';

import {
  finishSessionApi,
  getDeepDiveQuestionApi,
  getNextQuestionApi,
  submitAssessApi,
} from '@/apis/learning-api';
import useLearningSession, { ANSWER_PHASE } from '@/lib/stores/learning-session';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

const getEndLearningDisabledReason = (phase: string) => {
  if (phase === ANSWER_PHASE.FEEDBACK_LOADING) return '피드백이 완료된 후 이용할 수 있어요';
  if (phase === ANSWER_PHASE.STT_LOADING) return '음성 인식이 완료된 후 이용할 수 있어요';
  return undefined;
};

const getDeepDiveDisabledReason = (
  phase: string,
  isInsufficientAnswer: boolean,
  remainedCredit: number | null,
) => {
  if (!remainedCredit) return '크레딧이 부족해요';
  if (phase !== ANSWER_PHASE.FEEDBACK_DONE) return '피드백이 완료된 후 이용할 수 있어요';
  if (isInsufficientAnswer) return '답변이 충분하지 않아 딥다이브를 할 수 없어요';
  return undefined;
};

const getNextQuestionDisabledReason = (
  phase: string,
  isFeedbackPhase: boolean,
  remainedCredit: number | null,
) => {
  if (!remainedCredit) return '크레딧이 부족해요';
  if (isFeedbackPhase && phase !== ANSWER_PHASE.FEEDBACK_DONE)
    return '피드백이 완료된 후 이용할 수 있어요';
  return undefined;
};

const getSubmitAnswerDisabledReason = (
  phase: string,
  sttText: string | null,
  remainedCredit: number | null,
) => {
  if (!remainedCredit) return '크레딧이 부족해요';
  if (!sttText) return '인식된 답변이 없어요. 다시 녹음해 주세요';
  if (phase !== ANSWER_PHASE.STT_DONE) return '음성 인식이 완료된 후 제출할 수 있어요';
  return undefined;
};

type ButtonProps = {
  onClick: () => void;
  disabled: boolean;
  disabledReason?: string;
};

const useFloatingStepBarActions = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const remainedCredit = useLearningSession((state) => state.remainedCredit);

  const phase = useLearningSession((state) => state.phase);
  const setPhase = useLearningSession((state) => state.setPhase);
  const sttText = useLearningSession((state) => state.answer.sttText);
  const answerId = useLearningSession((state) => state.answer.answerId);
  const recordingTime = useLearningSession((state) => state.answer.recordingTime);
  const setAnswerId = useLearningSession((state) => state.setAnswerId);
  const resetAnswerFlow = useLearningSession((state) => state.resetAnswerFlow);
  const isInsufficientAnswer = useLearningSession((s) => {
    const fb = s.feedback.data;
    if (!fb) return false;
    return (
      (fb.strengths.length === 0 && fb.weaknesses.length === 0 && fb.suggestions.length === 0) ||
      fb.overallScore === 0
    );
  });

  const [rewardData, setRewardData] = useState<FinishSessionResponseDTO | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const loadingRef = useRef<Set<string>>(new Set());

  const isFeedbackPhase =
    phase === ANSWER_PHASE.FEEDBACK_LOADING || phase === ANSWER_PHASE.FEEDBACK_DONE;

  const markLoading = (name: string) => {
    loadingRef.current.add(name);
  };

  const unmarkLoading = (name: string) => {
    loadingRef.current.delete(name);
  };

  const isLoading = (name: string) => loadingRef.current.has(name);

  const handleEndLearning = async () => {
    if (!sessionId || isLoading('endLearning')) return;
    markLoading('endLearning');

    try {
      const data = await finishSessionApi({ sessionId });
      setRewardData(data);
      setIsRewardModalOpen(true);
    } finally {
      unmarkLoading('endLearning');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !question || !sttText || isLoading('submitAnswer')) return;
    markLoading('submitAnswer');

    try {
      setPhase(ANSWER_PHASE.FEEDBACK_LOADING);
      const { answerId: newAnswerId } = await submitAssessApi({
        sessionId,
        questionId: question.questionId,
        extraQuestionId: question.extraQuestionId,
        answerText: sttText,
        timeSpentSec: recordingTime,
      });

      setAnswerId(newAnswerId);
    } catch (error) {
      console.error('평가 제출 실패:', error);
    } finally {
      unmarkLoading('submitAnswer');
    }
  };

  const handleNextQuestion = async () => {
    if (!sessionId || isLoading('nextQuestion')) return;
    markLoading('nextQuestion');

    try {
      resetAnswerFlow();
      const data = await getNextQuestionApi(sessionId);
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    } finally {
      unmarkLoading('nextQuestion');
    }
  };

  const handleDeepDive = async () => {
    if (!sessionId || !answerId || isLoading('deepDive')) return;
    markLoading('deepDive');

    try {
      const data = await getDeepDiveQuestionApi(sessionId, answerId);
      resetAnswerFlow();
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    } finally {
      unmarkLoading('deepDive');
    }
  };

  const endLearning: ButtonProps = {
    onClick: handleEndLearning,
    disabled: phase === ANSWER_PHASE.FEEDBACK_LOADING || phase === ANSWER_PHASE.STT_LOADING,
    disabledReason: getEndLearningDisabledReason(phase),
  };

  const deepDive: ButtonProps = {
    onClick: handleDeepDive,
    disabled: phase !== ANSWER_PHASE.FEEDBACK_DONE || isInsufficientAnswer || !remainedCredit,
    disabledReason: getDeepDiveDisabledReason(phase, isInsufficientAnswer, remainedCredit),
  };

  const nextQuestion: ButtonProps = {
    onClick: handleNextQuestion,
    disabled: !remainedCredit || (isFeedbackPhase && phase !== ANSWER_PHASE.FEEDBACK_DONE),
    disabledReason: getNextQuestionDisabledReason(phase, isFeedbackPhase, remainedCredit),
  };

  const submitAnswer: ButtonProps = {
    onClick: handleSubmitAnswer,
    disabled: phase !== ANSWER_PHASE.STT_DONE || !sttText || !remainedCredit,
    disabledReason: getSubmitAnswerDisabledReason(phase, sttText, remainedCredit),
  };

  return {
    endLearning,
    deepDive,
    nextQuestion,
    submitAnswer,
    isFeedbackPhase,
    rewardModal: {
      data: rewardData,
      isOpen: isRewardModalOpen,
      onOpenChange: setIsRewardModalOpen,
    },
  };
};

export default useFloatingStepBarActions;
