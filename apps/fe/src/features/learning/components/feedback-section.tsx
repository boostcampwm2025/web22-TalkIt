import { useAnswerFlow } from '@/features/learning/lib/contexts/answer-flow-context';

import { Bot, CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react';

const FeedbackSection = () => {
  const { feedback } = useAnswerFlow();

  if (!feedback) return null;

  return (
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
            {feedback.weaknesses.map((weakness, index) => (
              <li className="text-sm" key={index}>
                {weakness}
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
          {feedback.suggestions.map((suggestion, index) => (
            <li className="text-sm" key={index}>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FeedbackSection;
