import { useEffect } from 'react';

import AnswerSection from '@/features/learning/components/question/answer-section';
import FeedbackSection from '@/features/learning/components/question/feedback-section';
import FloatingStepBar from '@/features/learning/components/question/floating-step-bar';
import QuestionContent from '@/features/learning/components/question/question-content';
import QuestionHeader from '@/features/learning/components/question/question-header';
import VoiceRecorderSection from '@/features/learning/components/question/voice-recorder-section';
import useLearningSession from '@/lib/stores/learning-session';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const QuestionPage = () => {
  const question = useLearningSession((state) => state.question);
  const navigate = useNavigate();

  useEffect(() => {
    let isUnloading = false;

    const handleBeforeUnload = () => {
      isUnloading = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!isUnloading) {
        useLearningSession.getState().resetAnswerFlow();
      }
    };
  }, []);

  if (!question) {
    navigate({ to: '/learning', replace: true });
    return null;
  }

  const sessionKey = question.questionId
    ? `question-${question.questionId}`
    : `extra-question-${question.extraQuestionId}`;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-250 flex-col gap-8 p-6 sm:p-10">
      <QuestionHeader />
      <QuestionContent key={`question-content-${sessionKey}`} />
      <VoiceRecorderSection key={`voice-recorder-section-${sessionKey}`} />
      <AnswerSection />
      <FeedbackSection />
      <div className="flex-1" />
      <FloatingStepBar />
    </div>
  );
};

export const Route = createFileRoute('/_main/learning/question')({
  component: QuestionPage,
});
