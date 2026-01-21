import { ANSWER_PHASE, useAnswerFlow } from '@/features/learning/lib/contexts/answer-flow-context';

const AnswerSection = () => {
  const { phase, sttText } = useAnswerFlow();

  const isLoading = phase === ANSWER_PHASE.STT_LOADING;
  const hasAnswer = sttText !== null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray bg-white p-8 shadow-sm after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary">
      <h3 className="sr-only">음성 인식 결과</h3>
      <p className="text-xl font-bold">나의 답변</p>
      <div className="mt-4 rounded-md">
        {isLoading ? (
          <p className="text-center text-dark-gray">음성 인식 중...</p>
        ) : hasAnswer ? (
          <p>{sttText}</p>
        ) : (
          <p className="text-center text-dark-gray">
            녹음을 제출하면 인식된 텍스트가 여기에 표시됩니다.
          </p>
        )}
      </div>
    </section>
  );
};

export default AnswerSection;
