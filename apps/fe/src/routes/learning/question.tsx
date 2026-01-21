import { useEffect, useState } from 'react';

import { submitRecordApi } from '@/apis/learning-api';
import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import PulsingMicButton from '@/features/learning/components/pulsing-mic-button';
import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession from '@/lib/stores/learning-session';
import type { GetFeedbackResponseDTO } from '@repo/shared/types/learning';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { ArrowLeft, Bot, CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react';

const mockFeedback: GetFeedbackResponseDTO = {
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

const QuestionPage = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const currentQuestionCount = useLearningSession((state) => state.currentQuestionCount);
  const remainedCredit = useLearningSession((state) => state.remainedCredit);
  const setRemainedCredit = useLearningSession((state) => state.setRemainedCredit);

  const [feedback, setFeedback] = useState<GetFeedbackResponseDTO | null>(null);

  const [answer, setAnswer] = useState<string>('');
  const [isRecordSubmitting, setIsRecordSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmitRecord = async (audioBlob: Blob) => {
    if (!sessionId || !question) return;

    try {
      setIsRecordSubmitting(true);
      const extension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      const audioFile = new File([audioBlob], `answer.${extension}`, { type: audioBlob.type });
      const { sttText } = await submitRecordApi({
        sessionId,
        questionId: question.questionId,
        audioFile,
      });

      setAnswer(sttText);

      handleMockApiResponse(); // TODO: 실제 API 연동 후 삭제
    } catch (error) {
      console.error('녹음 제출 실패:', error);
      // TODO: 에러 토스트 표시 또는 재시도 UI
    } finally {
      setIsRecordSubmitting(false);
    }
  };

  const { stream, isRecording, formattedTime, toggleRecording } = useVoiceRecorder({
    timeLimit: question?.timeLimit ?? 300,
    onRecordFinish: handleSubmitRecord,
  });

  const handleMockApiResponse = () => {
    setRemainedCredit(mockFeedback.remainingToken);
    setFeedback(mockFeedback);
  };

  useEffect(() => {
    if (!question) {
      navigate({ to: '/learning' });
    }
  }, [question, navigate]);

  if (!question) return null;

  return (
    <div className="mx-auto max-w-250 space-y-6 p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <Link
          to="/learning"
          className="flex items-center gap-3 transition-colors hover:text-slate-800"
        >
          <ArrowLeft size={20} />
          <div className="flex flex-col">
            <p className="text-base font-bold">
              {QUESTION_CATEGORY_CONFIG[question.category].label}
            </p>
            <span className="text-xs text-dark-gray">
              {QUESTION_DIFFICULTY_CONFIG[question.difficulty].label}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-dark-gray">질문 생성권</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
            {remainedCredit}
          </span>
        </div>
      </div>
      <section className="mx-auto max-w-150 space-y-4 text-center">
        <span className="inline-block rounded-full border border-primary/20 bg-gray px-3 py-1 text-xs font-bold text-primary sm:text-sm">
          질문 {currentQuestionCount}
        </span>
        <h2 className="text-2xl font-black break-keep sm:text-4xl">{question.content}</h2>
        <div className="break-keep text-dark-gray sm:text-lg">
          <div className="flex flex-wrap justify-center [&>span:not(:first-child)]:after:content-[',_']">
            <span>{question.guide}</span>

            <p className="pl-2">위 키워드를 중심으로 답변해보세요.</p>
          </div>
        </div>
      </section>
      {!answer && (
        <section className="flex flex-col items-center gap-6">
          <h3 className="sr-only">음성 답변</h3>
          <PulsingMicButton isRecording={isRecording} stream={stream} onToggle={toggleRecording} />
          <p className="text-lg sm:text-2xl">
            <span className="text-dark-gray">남은 시간: </span>
            {formattedTime}
          </p>
        </section>
      )}
      <section className="relative overflow-hidden rounded-2xl border border-gray bg-white p-8 shadow-sm after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary">
        <h3 className="sr-only">음성 인식 결과</h3>
        <p className="text-xl font-bold">나의 답변</p>
        <div className="mt-4 rounded-md">
          {isRecordSubmitting ? (
            <p className="text-center text-dark-gray">음성 인식 중...</p>
          ) : answer ? (
            <p>{answer}</p>
          ) : (
            <p className="text-center text-dark-gray">
              녹음을 제출하면 인식된 텍스트가 여기에 표시됩니다.
            </p>
          )}
        </div>
      </section>
      {feedback && (
        <section className="space-y-4">
          <h3 className="flex items-center gap-3 text-xl font-bold">
            <Bot className="h-10 w-10 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 p-2 text-white shadow-md" />
            AI 피드백
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4 rounded-2xl border border-[#22C55E] bg-[#F0FDF4]/50 p-6">
              <p className="flex items-center gap-2 text-lg font-bold text-[#14532D]">
                <CircleCheck className="h-5 w-5 text-[#16A34A]" />
                정확한 개념 설명
              </p>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-dark-green marker:text-[#22C55E]">
                {feedback.strengths.map((strength, index) => (
                  <li className="text-sm" key={index}>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 rounded-2xl border border-[#F97316] bg-[#FFF7ED]/50 p-6">
              <p className="flex items-center gap-2 text-lg font-bold text-[#7C2D12]">
                <TriangleAlert className="h-5 w-5 text-[#EA580C]" />
                보완하면 좋을 점
              </p>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-[#9A3412] marker:text-[#F97316]">
                {feedback.weaknesses.map((strength, index) => (
                  <li className="text-sm" key={index}>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-[#A855F7] bg-[#FAF5FF] p-6">
            <p className="flex items-center gap-2 text-lg font-bold text-[#9333EA]">
              <Lightbulb className="h-5 w-5 text-[#9333EA]" />
              도움이 될 팁
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[#6B21A8] marker:text-[#b064ee]">
              {feedback.suggestions.map((strength, index) => (
                <li className="text-sm" key={index}>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};

export const Route = createFileRoute('/learning/question')({
  component: QuestionPage,
});
