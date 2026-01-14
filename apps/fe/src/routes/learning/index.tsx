import { useState } from 'react';

import { QUESTION_DIFFICULTY_CONFIG, QUESTION_TOPIC_CONFIG } from '@/constants/question';
import { useProgressAnimation } from '@/features/learning/lib/hooks/use-progress-animation';
import { useStartSession } from '@/features/learning/lib/hooks/use-start-session';
import {
  QUESTION_DIFFICULTY,
  type QuestionDifficulty,
  type QuestionTopic,
} from '@repo/shared/constants/learning';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Flame, ListFilter, Mic, TrendingUp } from 'lucide-react';

// 사용자 mock 데이터
const MOCK_USER_DATA = {
  profile: {
    nickname: '코딩하는토끼',
    profileImage: 'https://s3.ap-northeast-2.amazonaws.com/talkit/profiles/user_123.png',
    bio: '안녕하세요, 백엔드 마스터를 꿈꾸는 개발자입니다.',
  },
  progression: {
    level: 12,
    currentXp: 450,
    requiredXpForNextLevel: 1200,
    lp: 1422,
  },
  studyStats: {
    solvedProblemCount: 128,
    streak: 5,
    totalStudyTime: 360,
  },
  social: {
    followerCount: 42,
    followingCount: 15,
  },
  remainingToken: 9,
};

const Learning = () => {
  const { profile, progression, studyStats } = MOCK_USER_DATA;

  const { startSession, isLoading } = useStartSession();
  const { progress, calculatedPercent } = useProgressAnimation(
    progression.currentXp,
    progression.requiredXpForNextLevel,
    100,
  );

  const [selectedTopic, setSelectedTopic] = useState<QuestionTopic | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty>(
    QUESTION_DIFFICULTY.MEDIUM,
  );

  const topicOptions = Object.values(QUESTION_TOPIC_CONFIG);
  const difficultyOptions = Object.values(QUESTION_DIFFICULTY_CONFIG);

  // 학습 시작 API 호출 함수 (추후 별도의 코드로 분리 예정)
  const handleStartClick = async () => {
    if (!selectedTopic) return;
    try {
      const data = await startSession(selectedTopic, selectedDifficulty);
      console.log('세션 생성 완료:', data);
      alert(`세션 ID: ${data.sessionId}`);
      // todo: 질문 데이터 응답을 받고 페이지 이동하는 로직 추가
    } catch (e) {
      alert('학습 시작 실패');
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-pale-blue p-8">
      <div className="w-full max-w-5xl space-y-8">
        {/* 상단 헤더 */}
        <header className="space-y-2">
          <div className="mb-4 text-sm font-bold">
            <Link to="/learning" className="text-primary">
              학습하기
            </Link>{' '}
            &gt;
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">
                안녕하세요, {profile.nickname}
                님! 👋
              </h1>
              <p className="text-gray-500">
                오늘도 CS 지식을 쌓아볼까요? 목표 달성까지
                <span className="font-bold text-primary">{100 - calculatedPercent}%</span> 남았어요.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray bg-white px-4 py-2 shadow-sm">
              <Flame className="h-5 w-5 text-orange" />
              <span className="text-sm font-semibold">연속 {studyStats.streak}일 학습 중</span>
            </div>
          </div>
        </header>

        {/* 사용자 스탯 */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray bg-white p-6 shadow-sm md:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-bold">현재 레벨 경험치</span>
              </div>
              <span className="text-sm text-dark-gray">다음 레벨: {progression.level + 1} Lv</span>
            </div>

            <div className="mb-2 flex items-end gap-2">
              <span className="text-4xl font-extrabold text-black">{calculatedPercent}%</span>
              <span className="mb-1 ml-auto text-sm text-dark-gray">
                {progression.currentXp} / {progression.requiredXpForNextLevel} XP
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

          <div className="flex flex-col justify-center rounded-2xl border border-gray bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">학습 요약</h3>
            <div className="flex gap-20">
              <div>
                <p className="mb-1 text-sm text-dark-gray">누적 답변</p>
                <p className="text-2xl font-bold text-black">{studyStats.solvedProblemCount}개</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-dark-gray">총 학습 시간</p>
                <p className="text-2xl font-bold text-primary">{studyStats.totalStudyTime}분</p>
              </div>
            </div>
          </div>
        </section>

        {/* 주제 선택 */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">학습 주제 선택 (Learning Path)</h2>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topicOptions.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`group cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-white shadow-md'
                      : 'border-transparent bg-transparent hover:border-gray-100 hover:bg-white'
                  }`}
                >
                  <div
                    className={`mb-3 text-black transition-colors group-hover:text-primary ${isSelected ? 'text-primary' : 'text-black'}`}
                  >
                    <topic.Icon className={`h-6 w-6`} />
                  </div>
                  <h3 className="mb-1 text-lg font-bold">{topic.label}</h3>
                  <p className="text-xs text-dark-gray">{topic.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 난이도 설정 */}
        <section className="mb-8 rounded-2xl border border-gray bg-white p-8 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">난이도 설정</h3>
          <div className="flex w-full rounded-lg bg-gray p-1">
            {difficultyOptions.map((diff) => (
              <button
                key={diff.value}
                onClick={() => setSelectedDifficulty(diff.value)}
                className={`flex-1 rounded-md py-2 text-sm transition-all ${
                  selectedDifficulty === diff.value
                    ? 'bg-white font-bold text-black shadow-sm'
                    : 'font-medium text-dark-gray hover:text-black'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-dark-gray">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-primary text-[0.625rem] text-primary">
              i
            </span>
            전공자 수준의 심화 질문이 출제됩니다.
          </div>
        </section>

        {/* 학습 시작 */}
        <section
          className={`relative flex transform flex-col items-center justify-between overflow-hidden rounded-2xl bg-black p-8 text-white transition-all duration-700 ease-in-out md:flex-row ${selectedTopic !== null ? `translate-y-0 opacity-100` : `pointer-events-none translate-y-10 opacity-0`}`}
        >
          <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-r from-primary/20 to-transparent"></div>

          <div className="z-10 mb-4 md:mb-0">
            <span className="mb-2 inline-block rounded-3xl border border-primary/30 bg-primary/30 px-2 py-1 text-xs text-primary">
              AI Learning
            </span>
            <h2 className="mb-1 text-xl font-bold">오늘의 AI 튜터가 준비되었습니다.</h2>
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
              난이도로 질문을 생성합니다.
            </p>
          </div>

          <button
            onClick={handleStartClick}
            disabled={isLoading}
            className={`z-10 flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-600' : 'bg-primary hover:bg-primary/80'} `}
          >
            {isLoading ? (
              <span>질문 생성 중...</span>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                학습 시작하기
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/learning/')({
  component: Learning,
});
