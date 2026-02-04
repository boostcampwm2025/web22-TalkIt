import type { UserInfoResponseDto } from '@repo/shared/types/user';
import { Link } from '@tanstack/react-router';

import { Flame } from 'lucide-react';

type LearningHeaderProps = {
  nickname: string;
  studyStats: UserInfoResponseDto['studyStats'];
  progression: UserInfoResponseDto['progression'];
  progress: number;
  calculatedPercent: number;
};

const LearningHeader = ({
  nickname,
  studyStats,
  progression,
  progress,
  calculatedPercent,
}: LearningHeaderProps) => {
  return (
    <header className="space-y-2">
      <div className="mb-4 text-sm font-bold">
        <Link to="/learning" className="text-primary">
          학습하기
        </Link>
      </div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-lg font-bold md:text-3xl">안녕하세요, {nickname}님! 👋</h1>
          <p className="text-sm text-dark-gray md:text-base">
            <span className="hidden md:inline">오늘도 CS 지식을 쌓아볼까요?</span> 목표 달성까지
            <span className="mx-1 font-bold text-primary">{100 - calculatedPercent}%</span>
            남았어요.
          </p>
        </div>
        <div className="self-start rounded-full border border-gray bg-white px-4 py-2 shadow-sm md:self-auto">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange" />
            <span className="text-sm font-semibold">연속 {studyStats.streak}일 학습 중</span>
          </div>
        </div>
      </div>

      {/* [모바일 전용] 레벨 프로그레스 바 */}
      <div className="mt-4 block rounded-xl md:hidden">
        <div className="mb-2 flex justify-between text-xs font-bold text-dark-gray">
          <span>
            {progression?.level} Lv ({progression?.currentXp} XP)
          </span>
          <span className="text-gray-400">
            {progression?.level + 1} Lv ({progression.requiredXpForNextLevel} XP)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
};

export default LearningHeader;
