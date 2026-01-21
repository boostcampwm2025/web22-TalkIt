import useLearningSession from '@/lib/stores/learning-session';

const QuestionContent = () => {
  const question = useLearningSession((state) => state.question);
  const currentQuestionCount = useLearningSession((state) => state.currentQuestionCount);

  if (!question) return null;

  return (
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
  );
};

export default QuestionContent;
