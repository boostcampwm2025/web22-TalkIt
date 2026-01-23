import { useState } from 'react';

import useLearningSession from '@/lib/stores/learning-session';

const QuestionContent = () => {
  const question = useLearningSession((state) => state.question);
  const currentQuestionCount = useLearningSession((state) => state.currentQuestionCount);
  const [showGuide, setShowGuide] = useState(false);

  if (!question) return null;

  return (
    <section className="mx-auto max-w-150 space-y-4 text-center">
      <span className="inline-block rounded-full border border-primary/20 bg-gray px-3 py-1 text-xs font-bold text-primary sm:text-sm">
        질문 {currentQuestionCount}
      </span>
      <h2 className="text-2xl font-black break-keep sm:text-4xl">{question.content}</h2>
      <div
        className={`flip-card cursor-pointer ${showGuide ? 'flipped' : ''}`}
        onClick={() => setShowGuide(!showGuide)}
      >
        <div className="flip-card-inner">
          <div className="flip-card-front flex items-center justify-center rounded-lg border border-dashed border-dark-gray/40 bg-gray/50 px-4 py-3">
            <p className="text-dark-gray">클릭하여 힌트 키워드를 알아보세요</p>
          </div>
          <div className="flip-card-back flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm break-keep text-dark-gray sm:text-base">{question.guide}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuestionContent;
