import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import useLearningSession from '@/lib/stores/learning-session';
import { Link } from '@tanstack/react-router';

import { ArrowLeft } from 'lucide-react';

const QuestionHeader = () => {
  const question = useLearningSession((state) => state.question);
  const remainedCredit = useLearningSession((state) => state.remainedCredit);

  if (!question) return null;

  return (
    <div className="flex items-center justify-between">
      <Link
        to="/learning"
        className="flex items-center gap-3 transition-colors hover:text-slate-800"
      >
        <ArrowLeft size={20} />
        <div className="flex flex-col">
          <p className="text-base font-bold">{QUESTION_CATEGORY_CONFIG[question.category].label}</p>
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
  );
};

export default QuestionHeader;
