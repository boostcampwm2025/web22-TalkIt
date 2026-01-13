import { useEffect } from 'react';

import { QUESTION_DIFFICULTY_KR, QUESTION_TOPIC_KR } from '@/constants/question';
import { useVoiceRecorder } from '@/features/study/lib/hooks/use-voice-recorder';
import useQuestion from '@/lib/stores/question';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { ArrowLeft, Mic } from 'lucide-react';

const QuestionPage = () => {
  const question = useQuestion((state) => state.question);
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
    <div className="mx-auto max-w-250 p-10">
      <Link to="/" className="flex items-center gap-3 transition-colors hover:text-slate-800">
        <ArrowLeft size={20} />
        <div className="flex flex-col">
          <p className="text-base font-bold">{QUESTION_TOPIC_KR[question.topic]}</p>
          <span className="text-xs text-dark-gray">
            {QUESTION_DIFFICULTY_KR[question.difficulty]}
          </span>
        </div>
      </Link>
      <section className="mx-auto mt-8 max-w-150 space-y-4 text-center">
        <span className="inline-block rounded-full border border-primary/20 bg-gray px-3 py-1 text-sm font-bold text-primary">
          질문 3 / 10
        </span>
        <h3 className="text-4xl font-black break-keep">{question.content}</h3>
        <div className="text-lg break-keep text-dark-gray">
          <div className="flex flex-wrap justify-center gap-x-2 [&>span:not(:last-child)]:after:content-[',_']">
            {question.guide.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <p>위 키워드를 중심으로 답변해보세요.</p>
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
        <p className="text-2xl">
          <span className="text-dark-gray">남은 시간: </span>
          {formattedTime}
        </p>
      </section>
    </div>
  );
};

export const Route = createFileRoute('/study/question')({
  component: QuestionPage,
});
