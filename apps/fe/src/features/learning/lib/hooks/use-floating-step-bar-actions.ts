import { useRef, useState } from 'react';

import {
  finishSessionApi,
  getDeepDiveQuestionApi,
  getNextQuestionApi,
  submitAssessApi,
} from '@/apis/learning-api';
import useLearningSession from '@/lib/stores/learning-session';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

import { ANSWER_PHASE, useAnswerFlow } from '../contexts/answer-flow-context';

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

  const {
    phase,
    setPhase,
    sttText,
    setAnswerId,
    answerId,
    recordingTime,
    reset,
    isInsufficientAnswer,
  } = useAnswerFlow();

  const [rewardData, setRewardData] = useState<FinishSessionResponseDTO | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const clickedButtonsRef = useRef<Set<string>>(new Set());

  const isFeedbackPhase =
    phase === ANSWER_PHASE.FEEDBACK_LOADING || phase === ANSWER_PHASE.FEEDBACK_DONE;

  const markClicked = (buttonName: string) => {
    clickedButtonsRef.current.add(buttonName);
  };

  const isClicked = (buttonName: string) => clickedButtonsRef.current.has(buttonName);

  const handleEndLearning = async () => {
    if (!sessionId || isClicked('endLearning')) return;
    markClicked('endLearning');

    const data = await finishSessionApi({ sessionId });
    setRewardData(data);
    setIsRewardModalOpen(true);
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !question || !sttText || isClicked('submitAnswer')) return;
    markClicked('submitAnswer');

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
    }
  };

  const handleNextQuestion = () => {
    if (!sessionId || isClicked('nextQuestion')) return;
    markClicked('nextQuestion');

    reset();
    getNextQuestionApi(sessionId).then((data) => {
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    });
  };

  const handleDeepDive = () => {
    if (!sessionId || !answerId || isClicked('deepDive')) return;
    markClicked('deepDive');

    getDeepDiveQuestionApi(sessionId, answerId).then((data) => {
      reset();
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    });
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
