import { useState } from 'react';

import { logoutUser } from '@/apis/auth-api';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Link, useNavigate } from '@tanstack/react-router';

import {
  AudioWaveform,
  BookOpen,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Swords,
  Trophy,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/learning', label: '학습하기', icon: BookOpen },
  { to: '/battle', label: '배틀 모드', icon: Swords },
  { to: '/mypage', label: '마이페이지', icon: User },
  { to: '/ranking', label: '랭킹', icon: Trophy },
];

// 사이드 바 컴포넌트
export const SideBar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const { clearAuth } = useAuthStore();
  const { userInfo, clearUserInfo } = useUserStore();

  const handleLogout = async () => {
    try {
      await logoutUser(); // API 호출
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuth(); // 인증 상태 초기화
      clearUserInfo(); // 유저 정보 초기화
      navigate({ to: '/' });
    }
  };

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col overflow-hidden border-r border-gray bg-white text-dark-gray transition-all duration-300 ease-in-out md:flex ${isOpen ? 'w-sidebar-open' : 'w-sidebar-close'}`}
    >
      <div className={`flex items-center gap-4 px-6 ${!isOpen ? `flex-col pt-3` : 'py-6'}`}>
        <Link to="/" className="flex flex-1 items-center gap-3 text-primary">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <AudioWaveform size={24} />
          </div>
          {isOpen && <span className="text-xl font-extrabold text-black">Talk It</span>}
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-dark-gray transition-colors hover:bg-primary/10"
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
          {userInfo?.profile.profileImage ? (
            <img
              src={userInfo.profile.profileImage}
              alt="Profile"
              className="h-10 w-10 shrink-0 rounded-full border border-gray object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray text-dark-gray">
              <User size={20} />
            </div>
          )}

          {/* 텍스트 정보 (열렸을 때만 표시) */}
          {isOpen && (
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-bold text-black">
                {userInfo?.profile.nickname ?? '사용자'}
              </span>
              <span className="truncate text-xs font-medium text-dark-gray">
                Level {userInfo?.progression.level ?? 1} • {userInfo?.progression.currentXp ?? 0} XP
              </span>
            </div>
          )}

          {/* 로그아웃 아이콘 */}
          {isOpen && (
            <button
              onClick={handleLogout}
              className="cursor-pointer text-dark-gray transition-colors hover:text-alert"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export const SideBarMobile = () => {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 flex h-15 items-center justify-around border-t border-gray bg-white px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] md:hidden">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeProps={{ className: 'text-primary' }}
          inactiveProps={{ className: 'text-dark-gray hover:text-dark-gray/70' }}
          className="flex w-full flex-col items-center justify-center gap-1 py-1"
        >
          {({ isActive }) => (
            <>
              <item.icon
                size={24}
                className={`transition-all ${isActive ? 'scale-105 stroke-[2.5px]' : ''}`}
              />
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
};
