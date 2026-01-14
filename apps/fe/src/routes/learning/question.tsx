import { useEffect } from 'react';

import { QUESTION_DIFFICULTY_KR, QUESTION_TOPIC_KR } from '@/constants/question';
import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession from '@/lib/stores/learning-session';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { ArrowLeft, Mic } from 'lucide-react';

const QuestionPage = () => {
  const question = useLearningSession((state) => state.question);
  const currentQuestionCount = useLearningSession((state) => state.currentQuestionCount);
  const remainedCredit = useLearningSession((state) => state.remainedCredit);

  const navigate = useNavigate();

  const { isRecording, formattedTime, toggleRecording } = useVoiceRecorder({
    timeLimit: question?.timeLimit ?? 300,
  });

  useEffect(() => {
    if (!question) {
      navigate({ to: '/' });
    }
  }, [question, navigate]);

  if (!question) return null;

  return (
    <div className="mx-auto max-w-250 p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 transition-colors hover:text-slate-800">
          <ArrowLeft size={20} />
          <div className="flex flex-col">
            <p className="text-base font-bold">{QUESTION_TOPIC_KR[question.topic]}</p>
            <span className="text-xs text-dark-gray">
              {QUESTION_DIFFICULTY_KR[question.difficulty]}
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
      <section className="mx-auto mt-8 max-w-150 space-y-4 text-center">
        <span className="inline-block rounded-full border border-primary/20 bg-gray px-3 py-1 text-xs font-bold text-primary sm:text-sm">
          질문 {currentQuestionCount}
        </span>
        <h2 className="text-2xl font-black break-keep sm:text-4xl">{question.content}</h2>
        <div className="break-keep text-dark-gray sm:text-lg">
          <div className="flex flex-wrap justify-center [&>span:not(:first-child)]:before:content-[',_']">
            {question.guide.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
            <p className="pl-2">위 키워드를 중심으로 답변해보세요.</p>
          </div>
        </div>
      </section>
      <section className="mt-10 flex flex-col items-center gap-4">
        <button
          onClick={toggleRecording}
          className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-all ${
            isRecording
              ? 'bg-red-500 shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40'
              : 'bg-primary shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
          }`}
        >
          <Mic className="h-10 w-10 text-white" />
        </button>
        <p className="text-lg sm:text-2xl">
          <span className="text-dark-gray">남은 시간: </span>
          {formattedTime}
        </p>
      </section>
    </div>
  );
};

export const Route = createFileRoute('/learning/question')({
  component: QuestionPage,
});
