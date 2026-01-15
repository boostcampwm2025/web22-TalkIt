import { useState } from 'react';

import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import { useProgressAnimation } from '@/features/learning/lib/hooks/use-progress-animation';
import { useStartSession } from '@/features/learning/lib/hooks/use-start-session';
import { useUserStore } from '@/lib/stores/user-store';
import { type QuestionCategory, type QuestionDifficulty } from '@repo/shared/constants/learning';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Flame, ListFilter, Mic, TrendingUp } from 'lucide-react';

const LearningPage = () => {
  const userInfo = useUserStore((state) => state.userInfo);

  const { startSession, isLoading } = useStartSession();

  const { profile, progression, studyStats } = userInfo;

  const { progress, calculatedPercent } = useProgressAnimation(
    progression?.currentXp ?? 0,
    progression?.requiredXpForNextLevel ?? 100,
    100,
  );

  const [selectedTopic, setSelectedTopic] = useState<QuestionCategory | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | null>(null);

  const topicOptions = Object.values(QUESTION_CATEGORY_CONFIG);
  const difficultyOptions = Object.values(QUESTION_DIFFICULTY_CONFIG);

  const handleStartClick = async () => {
    if (!selectedTopic || !selectedDifficulty) return;
    try {
      const data = await startSession(selectedTopic, selectedDifficulty);
      console.log('세션 생성 완료:', data);
      alert(`세션 ID: ${data.sessionId}`);
    } catch (e) {
      alert('학습 시작 실패');
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-pale-blue p-8">
      <div className="w-full max-w-5xl space-y-6 md:space-y-8">
        {/* 상단 헤더 */}
        <header className="space-y-2">
          <div className="mb-4 text-sm font-bold">
            <Link to="/learning" className="text-primary">
              학습하기
            </Link>
          </div>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="mb-2 text-lg font-bold md:text-3xl">
                안녕하세요, {profile.nickname}
                님! 👋
              </h1>
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

        {/* 사용자 스탯 */}
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
                style={{
                  width: `${progress}%`,
                }}
              ></div>
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
                <p className="text-2xl font-bold text-primary">{studyStats?.totalStudyTime}분</p>
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
            <p className="text-lg font-bold text-primary">{studyStats?.totalStudyTime}분</p>
          </div>
        </section>

        {/* 주제 선택 */}
        <section>
          <div className="mb-4 flex items-center gap-2 md:mb-6">
            <ListFilter className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold md:text-xl">학습 주제 선택 (Learning Path)</h2>
          </div>

          <ul className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible lg:grid-cols-4">
            {topicOptions.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <li key={topic.id} className="min-w-55 md:min-w-0">
                  <label
                    className={`group block h-full cursor-pointer rounded-xl border-2 p-4 transition-all active:scale-95 md:active:scale-100 ${
                      isSelected
                        ? 'border-primary bg-white shadow-md'
                        : 'border-transparent bg-transparent hover:border-gray hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="learning-topic"
                      value={topic.id}
                      checked={isSelected}
                      onChange={() => setSelectedTopic(topic.id)}
                      className="sr-only"
                    />

                    <div
                      className={`mb-3 transition-colors group-hover:text-primary ${isSelected ? 'text-primary' : 'text-black'}`}
                    >
                      <topic.Icon className="h-6 w-6" />
                    </div>
                    <p className="mb-1 text-lg font-bold">{topic.label}</p>
                    <p className="text-xs text-dark-gray">{topic.description}</p>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 난이도 설정 */}
        <section
          className={`rounded-2xl border border-gray bg-white p-5 shadow-sm transition-all duration-700 ease-in-out md:p-8 ${selectedTopic !== null ? `translate-y-0 opacity-100` : `pointer-events-none translate-y-10 opacity-0`}`}
        >
          <h2 className="mb-4 text-lg font-bold md:text-xl">난이도 설정</h2>

          <ul className="flex w-full rounded-lg bg-gray p-1">
            {difficultyOptions.map((diff) => {
              const isSelected = selectedDifficulty === diff.value;
              return (
                <li key={diff.value} className="flex-1">
                  <label
                    className={`flex cursor-pointer items-center justify-center rounded-md py-3 text-sm transition-all active:scale-95 md:py-2 md:active:scale-100 ${
                      isSelected
                        ? 'bg-white font-bold text-black shadow-sm'
                        : 'font-medium text-dark-gray hover:text-black'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty-level"
                      value={diff.value}
                      checked={isSelected}
                      onChange={() => setSelectedDifficulty(diff.value)}
                      className="sr-only"
                    />
                    {diff.label}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-start gap-2 text-xs text-dark-gray md:items-center">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary text-[0.625rem] text-primary">
              i
            </span>
            <span>전공자 수준의 심화 질문이 출제됩니다.</span>
          </div>
        </section>

        {/* 학습 시작 버튼 섹션 */}
        <section
          className={`relative flex transform flex-col items-center justify-between overflow-hidden rounded-2xl bg-black p-6 text-white transition-all duration-700 ease-in-out md:flex-row md:p-8 ${selectedTopic !== null && selectedDifficulty !== null ? `translate-y-0 opacity-100` : `pointer-events-none translate-y-10 opacity-0`}`}
        >
          <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-r from-primary/20 to-transparent"></div>

          <div className="z-10 mb-6 w-full md:mb-0 md:w-auto">
            <span className="mb-2 inline-block rounded-3xl border border-primary/30 bg-primary/30 px-2 py-1 text-xs text-primary">
              AI Learning
            </span>
            <p className="mb-1 text-lg font-bold md:text-xl">오늘의 AI 튜터가 준비되었습니다.</p>
            <p className="text-sm text-gray">
              선택하신{' '}
              <span className="font-bold text-primary">
                {topicOptions.find((t) => t.id === selectedTopic)?.label}
              </span>{' '}
              주제 /
              <span className="font-bold text-primary">
                {' '}
                {difficultyOptions.find((d) => d.value === selectedDifficulty)?.label}
              </span>{' '}
              난이도
            </p>
          </div>

          <button
            onClick={handleStartClick}
            disabled={isLoading}
            className={`z-10 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-medium text-white transition-colors md:w-auto md:py-3 ${isLoading ? 'cursor-not-allowed bg-gray-600' : 'bg-primary hover:bg-primary/80'} `}
          >
            {isLoading ? (
              <span>질문 생성 중...</span>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span className="text-lg md:text-base">학습 시작하기</span>
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/learning/')({
  component: LearningPage,
});
