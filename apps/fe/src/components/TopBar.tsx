import { useEffect, useRef, useState } from 'react';

import { logoutUser } from '@/apis/auth-api';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Link, useNavigate } from '@tanstack/react-router';

import { AudioWaveform, LogOut, User } from 'lucide-react';

export const TopBar = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { isAuthenticated, clearAuth } = useAuthStore();
  const { userInfo, clearUserInfo } = useUserStore();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuth(); // 인증 토큰 삭제
      clearUserInfo(); // 사용자 정보 삭제
      setIsDropdownOpen(false);
      navigate({ to: '/' }); // 4. 메인으로 이동
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray bg-white px-4 shadow-sm md:px-8">
      <Link to="/" className="group flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/10">
          <AudioWaveform size={20} strokeWidth={2.5} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-black">Talk It</span>
      </Link>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            {/* 1. 네비게이션 메뉴 (데스크탑) */}
            <nav className="mr-4 hidden items-center gap-6 md:flex">
              <Link
                to="/learning"
                className="text-sm font-semibold text-dark-gray transition-colors hover:text-primary"
              >
                학습하기
              </Link>
              <Link
                to="/battle"
                className="text-sm font-semibold text-dark-gray transition-colors hover:text-primary"
              >
                배틀모드
              </Link>
              <Link
                to="/ranking"
                className="text-sm font-semibold text-dark-gray transition-colors hover:text-primary"
              >
                랭킹
              </Link>
            </nav>

            {/* 2. 프로필 드롭다운 */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray p-1 pl-3 transition-colors hover:bg-gray focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <span className="hidden text-sm font-medium text-black sm:block">
                  {userInfo?.profile.nickname ?? '사용자'} 님
                </span>
                {/* 프로필 이미지 영역 */}
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray text-dark-gray">
                  {userInfo?.profile.profileImage ? (
                    <img
                      src={userInfo.profile.profileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={18} />
                  )}
                </div>
              </button>

              {/* 드롭다운 메뉴 본문 */}
              {isDropdownOpen && (
                <div className="ring-opacity-5 animate-in fade-in zoom-in-95 absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-gray bg-white py-1 shadow-lg ring-1 ring-black duration-100">
                  <div className="border-b border-gray px-4 py-3 sm:hidden">
                    <p className="truncate text-sm font-medium text-black">
                      {userInfo?.profile.nickname ?? '사용자'}
                    </p>
                  </div>

                  <Link
                    to="/mypage"
                    className="flex w-full items-center rounded-xl px-4 py-2 text-sm text-dark-gray transition-colors hover:bg-gray hover:text-primary"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    마이페이지
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-4 py-2 text-sm text-alert transition-colors hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="hidden rounded-lg bg-gray px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-medium-gray md:inline-block"
            >
              로그인
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/80"
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </header>
  );
};
