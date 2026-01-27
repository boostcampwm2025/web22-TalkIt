import { ANSWER_PHASE, useAnswerFlow } from '@/features/learning/lib/contexts/answer-flow-context';

const AnswerSection = () => {
  const { phase, sttText } = useAnswerFlow();

  const isSttLoading = phase === ANSWER_PHASE.STT_LOADING;

  const shouldShow = phase !== ANSWER_PHASE.IDLE && phase !== ANSWER_PHASE.RECORDING;
  if (!shouldShow) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray bg-white p-8 shadow-sm after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary">
      <h3 className="sr-only">음성 인식 결과</h3>
      <p className="text-xl font-bold">나의 답변</p>
      <div className="mt-4 rounded-md">
        {isSttLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="loader-dots" />
            <p className="text-dark-gray">AI가 음성을 텍스트로 변환하고 있어요</p>
          </div>
        ) : sttText ? (
          <p>{sttText}</p>
        ) : (
          <p>음성이 인식되지 않았어요. 다시 녹음해 주세요</p>
        )}
      </div>
    </section>
  );
};

export default AnswerSection;
