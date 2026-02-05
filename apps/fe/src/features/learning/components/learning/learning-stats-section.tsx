import type { UserInfoResponseDto } from '@repo/shared/types/user';

import { TrendingUp } from 'lucide-react';

type LearningStatsSectionProps = {
  progression: UserInfoResponseDto['progression'];
  studyStats: UserInfoResponseDto['studyStats'];
  progress: number;
  calculatedPercent: number;
};

const LearningStatsSection = ({
  progression,
  studyStats,
  progress,
  calculatedPercent,
}: LearningStatsSectionProps) => {
  return (
    <>
      <section className="hidden grid-cols-1 gap-4 md:grid md:gap-6 lg:grid-cols-3">
        {/* 경험치 바 카드 */}
        <div className="rounded-2xl border border-gray bg-white p-5 shadow-sm md:col-span-2 md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1.5">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">현재 레벨 경험치</h2>
            </div>
            <span className="text-sm text-dark-gray">
              다음 레벨: {(progression?.level ?? 0) + 1} Lv
            </span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-3xl font-extrabold text-black md:text-4xl">
              {calculatedPercent}%
            </span>
            <span className="mb-1 ml-auto text-xs text-dark-gray md:text-sm">
              {progression?.currentXp} / {progression?.requiredXpForNextLevel} XP
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 요약 통계 카드 */}
        <div className="flex flex-col justify-center rounded-2xl border border-gray bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-bold">학습 요약</h2>
          <div className="flex justify-between px-2 sm:justify-start sm:gap-20 sm:px-0">
            <div>
              <p className="mb-1 text-sm text-dark-gray">누적 답변</p>
              <p className="text-2xl font-bold text-black">{studyStats?.solvedProblemCount}개</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-dark-gray">총 학습 시간</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round((studyStats?.totalStudyTime ?? 0) / 60)}분
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 모바일 전용 통계 카드 */}
      <section className="grid grid-cols-2 gap-3 md:hidden">
        <div className="flex flex-col justify-center rounded-2xl border border-gray bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm text-dark-gray">누적 답변</p>
          <p className="text-lg font-bold text-black">{studyStats?.solvedProblemCount}개</p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-gray bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm text-dark-gray">총 학습 시간</p>
          <p className="text-lg font-bold text-primary">
            {Math.round((studyStats?.totalStudyTime ?? 0) / 60)}분
          </p>
        </div>
      </section>
    </>
  );
};

export default LearningStatsSection;
