import { useEffect } from 'react';

import { getFeedbackApi, submitAssessApi, submitRecordApi } from '@/apis/learning-api';
import AnswerSection from '@/features/learning/components/answer-section';
import FeedbackSection from '@/features/learning/components/feedback-section';
import QuestionContent from '@/features/learning/components/question-content';
import QuestionHeader from '@/features/learning/components/question-header';
import VoiceRecorderSection from '@/features/learning/components/voice-recorder-section';
import {
  ANSWER_PHASE,
  AnswerFlowProvider,
  useAnswerFlow,
} from '@/features/learning/lib/contexts/answer-flow-context';
import { useAssessmentStream } from '@/features/learning/lib/hooks/use-assessment-stream';
import useLearningSession from '@/lib/stores/learning-session';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const QuestionPageContent = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const setRemainedCredit = useLearningSession((state) => state.setRemainedCredit);

  const {
    phase,
    setPhase,
    setSttText,
    setFeedback,
    setAssessmentStatus,
    answerId,
    setAnswerId,
    recordingTime,
  } = useAnswerFlow();

  const navigate = useNavigate();

  const handleFeedbackDone = async () => {
    if (!answerId) return;

    try {
      const feedback = await getFeedbackApi(answerId);
      setFeedback(feedback);
      setRemainedCredit(feedback.remainingToken);
      setPhase(ANSWER_PHASE.FEEDBACK_DONE);
    } catch (error) {
      console.error('피드백 조회 실패:', error);
    }
  };

  useAssessmentStream({
    answerId,
    onStatusChange: setAssessmentStatus,
    onDone: handleFeedbackDone,
    onError: (error) => {
      console.error('SSE 오류:', error);
    },
  });

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!sessionId || !question) return;

    try {
      setPhase(ANSWER_PHASE.STT_LOADING);

      const extension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      const audioFile = new File([audioBlob], `answer.${extension}`, { type: audioBlob.type });
      const { sttText } = await submitRecordApi({
        sessionId,
        questionId: question.questionId,
        audioFile,
      });

      setSttText(sttText);
      setPhase(ANSWER_PHASE.STT_DONE);

      setPhase(ANSWER_PHASE.FEEDBACK_LOADING);
      const { answerId: newAnswerId } = await submitAssessApi({
        sessionId,
        questionId: question.questionId,
        answerText: sttText,
        timeSpentSec: recordingTime,
      });

      setAnswerId(newAnswerId);
    } catch (error) {
      console.error('녹음 제출 실패:', error);
    }
  };

  useEffect(() => {
    if (!question) {
      navigate({ to: '/learning' });
    }
  }, [question, navigate]);

  if (!question) return null;

  return (
    <div className="mx-auto max-w-250 space-y-6 p-6 sm:p-10">
      <QuestionHeader />
      <QuestionContent />
      <VoiceRecorderSection onRecordingComplete={handleRecordingComplete} />
      <AnswerSection />
      {phase === ANSWER_PHASE.FEEDBACK_DONE && <FeedbackSection />}
    </div>
  );
};

const QuestionPage = () => {
  return (
    <AnswerFlowProvider>
      <QuestionPageContent />
    </AnswerFlowProvider>
  );
};

export const Route = createFileRoute('/learning/question')({
  component: QuestionPage,
});
