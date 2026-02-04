import useLearningSession, { ANSWER_PHASE } from '@/lib/stores/learning-session';
import { ASSESSMENT_STATUS, type AssessmentStatus } from '@repo/shared/constants/learning';
import type { GetFeedbackResponseDTO } from '@repo/shared/types/learning';

import {
  BookOpen,
  Bot,
  CircleCheck,
  Info,
  Lightbulb,
  Loader2,
  type LucideIcon,
  Search,
  ThumbsUp,
  TriangleAlert,
} from 'lucide-react';

const ASSESSMENT_STATUS_MESSAGE: Record<string, string> = {
  [ASSESSMENT_STATUS.QUEUED]: '평가 대기 중...',
  [ASSESSMENT_STATUS.EVALUATING]: '답변을 평가하고 있습니다...',
  [ASSESSMENT_STATUS.FEEDBACKING]: '피드백을 생성하고 있습니다...',
  [ASSESSMENT_STATUS.REWARDING]: '보상을 계산하고 있습니다...',
  [ASSESSMENT_STATUS.FAILED]: '평가에 실패했습니다.',
};

const getStatusMessage = (assessmentStatus: AssessmentStatus | null) => {
  if (!assessmentStatus) return '평가를 시작하고 있습니다...';
  return ASSESSMENT_STATUS_MESSAGE[assessmentStatus] || '처리 중...';
};

const FeedbackSection = () => {
  const phase = useLearningSession((s) => s.phase);
  const feedback = useLearningSession((s) => s.feedback.data);
  const assessmentStatus = useLearningSession((s) => s.feedback.assessmentStatus);
  const isInsufficientAnswer = useLearningSession((s) => {
    const fb = s.feedback.data;
    if (!fb) return false;
    return (
      (fb.strengths.length === 0 && fb.weaknesses.length === 0 && fb.suggestions.length === 0) ||
      fb.overallScore === 0
    );
  });

  const isFeedbackLoading = phase === ANSWER_PHASE.FEEDBACK_LOADING;

  if (phase !== ANSWER_PHASE.FEEDBACK_LOADING && phase !== ANSWER_PHASE.FEEDBACK_DONE) return null;

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-3 text-xl font-bold">
        <Bot className="h-10 w-10 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 p-2 text-white shadow-md" />
        AI 피드백
      </h3>

      {isFeedbackLoading || !feedback ? (
        <LoadingContent message={getStatusMessage(assessmentStatus)} />
      ) : isInsufficientAnswer ? (
        <InsufficientAnswerFeedbackContent />
      ) : (
        <FeedbackContent feedback={feedback} />
      )}
    </section>
  );
};

export default FeedbackSection;

const LoadingContent = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg bg-primary/5 p-4">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <p className="text-sm font-medium text-primary">{message}</p>
  </div>
);

const InsufficientAnswerFeedbackContent = () => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#6366F1] bg-linear-to-br from-[#EEF2FF] to-[#E0E7FF] p-8">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/10">
      <BookOpen className="h-8 w-8 text-[#6366F1]" />
    </div>
    <div className="text-center">
      <p className="text-lg font-bold text-[#3730A3]">조금 더 학습하고 다시 도전해보세요!</p>
      <p className="mt-2 text-sm text-[#4338CA]">
        질문의 핵심 키워드를 파악하고, 가이드를 참고해서 답변해보세요.
      </p>
    </div>
  </div>
);

const FeedbackContent = ({ feedback }: { feedback: GetFeedbackResponseDTO }) => (
  <>
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#22C55E] bg-[#F0FDF4]/50 p-6">
        <p className="flex items-center gap-2 text-lg font-bold text-[#14532D]">
          <CircleCheck className="h-5 w-5 text-[#16A34A]" />
          정확한 개념 설명
        </p>
        {feedback.strengths.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-dark-green marker:text-[#22C55E]">
            {feedback.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        ) : (
          <EmptyListItem message="핵심 개념에 대해 더 구체적으로 설명해보세요" icon={Search} />
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#F97316] bg-[#FFF7ED]/50 p-6">
        <p className="flex items-center gap-2 text-lg font-bold text-[#7C2D12]">
          <TriangleAlert className="h-5 w-5 text-[#EA580C]" />
          보완하면 좋을 점
        </p>
        {feedback.weaknesses.length > 0 ? (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[#9A3412] marker:text-[#F97316]">
            {feedback.weaknesses.map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        ) : (
          <EmptyListItem message="특별히 보완할 점이 없어요!" icon={ThumbsUp} />
        )}
      </div>
    </div>
    <div className="flex flex-col gap-4 rounded-2xl border border-[#A855F7] bg-[#FAF5FF] p-6">
      <p className="flex items-center gap-2 text-lg font-bold text-[#9333EA]">
        <Lightbulb className="h-5 w-5 text-[#9333EA]" />
        도움이 될 팁
      </p>
      {feedback.suggestions.length > 0 ? (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[#6B21A8] marker:text-[#b064ee]">
          {feedback.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      ) : (
        <EmptyListItem message="추가로 드릴 팁이 없어요" icon={Info} />
      )}
    </div>
  </>
);

const EmptyListItem = ({ message, icon: Icon }: { message: string; icon: LucideIcon }) => (
  <div className="flex flex-1 items-center justify-center gap-2">
    <Icon className="h-4 w-4" />
    {message}
  </div>
);
