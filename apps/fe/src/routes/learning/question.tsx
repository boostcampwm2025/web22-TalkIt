import { useCallback, useEffect } from 'react';

import { submitRecordApi } from '@/apis/learning-api';
import AnswerSection from '@/features/learning/components/answer-section';
import FeedbackSection from '@/features/learning/components/feedback-section';
import FloatingStepBar from '@/features/learning/components/floating-step-bar';
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
import type { GetFeedbackResponseDTO } from '@repo/shared/types/learning';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const mockFeedbackResponse: GetFeedbackResponseDTO = {
  answerId: 555,
  question: '프로세스의 정의를 설명하세요',
  answer: '나의 답변 뭐시기 저시기',
  overallScore: 72,
  strengths: ['개념 요약이 빠르다', '예시를 들려는 시도가 있다'],
  weaknesses: ['UDP의 연결성 설명이 틀렸다', '핵심 비교(TCP) 부재'],
  suggestions: ['UDP는 connectionless임을 명확히 하세요', 'TCP와 비교해 설명해보세요'],
  followUpQuestions: ['UDP에서 신뢰성이 필요하면 어떻게 보완하나요?'],
  xp: 150,
  remainingToken: 9,
};

const QuestionPageContent = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const setRemainedCredit = useLearningSession((state) => state.setRemainedCredit);

  const { setPhase, setSttText, setFeedback, setAssessmentStatus, answerId } = useAnswerFlow();

  const navigate = useNavigate();

  const handleFeedbackDone = useCallback(async () => {
    if (!answerId) return;

    try {
      const feedback = mockFeedbackResponse; // TODO: 실제 API로 변경
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
        audioFile,
      });

      setSttText(sttText);
      setPhase(ANSWER_PHASE.STT_DONE);
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
    <div className="relative mx-auto flex min-h-screen max-w-250 flex-col gap-8 p-6 sm:p-10">
      <QuestionHeader />
      <QuestionContent />
      <VoiceRecorderSection onRecordingComplete={handleRecordingComplete} />
      <AnswerSection />
      <FeedbackSection />
      <div className="flex-1" />
      <FloatingStepBar />
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
