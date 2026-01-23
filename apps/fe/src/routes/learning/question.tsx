import { useCallback, useRef } from 'react';

import { getFeedbackApi, submitRecordApi } from '@/apis/learning-api';
import AnswerSection from '@/features/learning/components/question/answer-section';
import FeedbackSection from '@/features/learning/components/question/feedback-section';
import FloatingStepBar from '@/features/learning/components/question/floating-step-bar';
import QuestionContent from '@/features/learning/components/question/question-content';
import QuestionHeader from '@/features/learning/components/question/question-header';
import VoiceRecorderSection from '@/features/learning/components/question/voice-recorder-section';
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

  const lastQuestionRef = useRef(question);
  if (question) {
    lastQuestionRef.current = question;
  }
  const activeQuestion = question || lastQuestionRef.current;

  const { setPhase, setSttText, setFeedback, setAssessmentStatus, answerId } = useAnswerFlow();

  const navigate = useNavigate();

  const handleFeedbackDone = useCallback(async () => {
    if (!answerId) return;

    try {
      const feedback = await getFeedbackApi(answerId);
      setFeedback(feedback);
      setRemainedCredit(feedback.remainingToken);
      setPhase(ANSWER_PHASE.FEEDBACK_DONE);
    } catch (error) {
      console.error('피드백 조회 실패:', error);
    }
  }, [answerId, setFeedback, setPhase, setRemainedCredit]);

  useAssessmentStream({
    answerId,
    onStatusChange: setAssessmentStatus,
    onDone: handleFeedbackDone,
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
        extraQuestionId: question.extraQuestionId,
        audioFile,
      });

      setSttText(sttText);
      setPhase(ANSWER_PHASE.STT_DONE);
    } catch (error) {
      console.error('녹음 제출 실패:', error);
    }
  };

  if (!activeQuestion) {
    navigate({ to: '/learning', replace: true });
    return null;
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-250 flex-col gap-8 p-6 sm:p-10">
      <QuestionHeader />
      <QuestionContent />
      <VoiceRecorderSection
        key={`voice-recorder-section-${question?.questionId}`}
        onRecordingComplete={handleRecordingComplete}
      />
      <AnswerSection />
      <FeedbackSection />
      <div className="flex-1" />
      <FloatingStepBar key={`floating-step-bar-${question?.questionId}`} />
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
