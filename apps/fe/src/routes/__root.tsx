import { useEffect, useState } from 'react';

import useQuestion from '@/lib/stores/learning-session';
import type { CreateQuestionResponseDTO } from '@repo/shared/types/learning';
import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import {
  AudioWaveform,
  BookOpen,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Swords,
  Trophy,
  User,
} from 'lucide-react';

const mockQuestionResponse: CreateQuestionResponseDTO = {
  sessionId: 1,
  currentQuestionCount: 1,
  remainedCredit: 5,
  question: {
    questionId: 101,
    content: '성능 최적화와 데이터 일관성 유지를 위한 격리 수준 선택 기준은?',
    guide: [
      'Read Committed',
      'Write Skew',
      'Lock Contention',
      'Concurrency',
      'Isolation Level Tuning',
    ],
    topic: 'DATABASE',
    difficulty: 'MEDIUM',
    timeLimit: 300,
  },
};

const MOCK_PROFILE = {
  nickname: '김개발님',
  level: 14,
  xp: 850,
  profileImage: 'https://s3.ap-northeast-2.amazonaws.com/talkit/profiles/user_123.png', // 예시 이미지
};

const RootLayout = () => {
  const [isOpen, setIsOpen] = useState(true);

  // 이전 페이지에서 질문을 넣어주기 위해서 임시로 작성했습니다.
  const setQuestion = useQuestion((state) => state.setQuestion);

  useEffect(() => {
    setQuestion(mockQuestionResponse);
  }, [setQuestion]);

  const NAV_ITEMS = [
    { to: '/learning', label: '학습하기', icon: BookOpen },
    { to: '/battle', label: '배틀 모드', icon: Swords },
    { to: '/mypage', label: '마이페이지', icon: User },
    { to: '/ranking', label: '랭킹', icon: Trophy },
    { to: '/settings', label: '설정', icon: Settings },
  ];

  return (
    <>
      <div className="flex h-screen">
        {/* 사이드바 컨테이너 */}
        <div
          className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-gray bg-white text-dark-gray transition-all duration-300 ease-in-out ${isOpen ? 'w-sidebar-open' : 'w-sidebar-close'}`}
        >
          <div className={`flex items-center gap-4 px-6 ${!isOpen ? `flex-col pt-3` : 'py-6'}`}>
            <div className="flex flex-1 items-center gap-3 text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <AudioWaveform size={24} />
              </div>
              {isOpen && <span className="text-xl font-extrabold text-black">Talk It</span>}
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="z-10 rounded-lg p-2 text-dark-gray transition-colors hover:bg-primary/10"
            >
              {isOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{
                  className: 'bg-primary/10 text-primary font-bold',
                }}
                inactiveProps={{
                  className: 'text-dark-gray hover:bg-gray hover:text-dark-gray',
                }}
                className={`group flex h-auto items-center gap-4 rounded-xl transition-colors ${isOpen ? 'p-3' : 'p-2'}`}
              >
                <item.icon size={22} className={`transition-colors ${!isOpen && 'mx-auto'}`} />

                {/* 네비게이션 바 아이템 텍스트: 닫히면 숨김 */}
                <span
                  className={`text-base whitespace-nowrap duration-200 ${
                    isOpen ? 'opacity-100' : 'hidden w-0 opacity-0'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray p-4">
            <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
              {/* 프로필 이미지 */}
              <img
                src={MOCK_PROFILE.profileImage}
                alt="Profile"
                className="h-10 w-10 shrink-0 rounded-full border border-gray object-cover"
              />

              {/* 텍스트 정보 (열렸을 때만 표시) */}
              {isOpen && (
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="truncate text-sm font-bold text-black">
                    {MOCK_PROFILE.nickname}
                  </span>
                  <span className="truncate text-xs font-medium text-dark-gray">
                    Level {MOCK_PROFILE.level} • {MOCK_PROFILE.xp} XP
                  </span>
                </div>
              )}

              {/* 로그아웃 아이콘 */}
              {isOpen && (
                <button className="cursor-pointer text-dark-gray transition-colors hover:text-alert">
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
