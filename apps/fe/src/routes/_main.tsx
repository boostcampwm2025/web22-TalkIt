import { refreshAccessTokenApi } from '@/apis/auth-api';
import { getUserInfoApi } from '@/apis/user-api';
import { SideBar, SideBarMobile } from '@/components/SideBar';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      {/* 데스크탑 사이드바 */}
      <SideBar />

      {/* 모바일 하단 탭 */}
      <SideBarMobile />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto bg-pale-blue">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_main')({
  beforeLoad: async ({ location }) => {
    // 1. Zustand 스토어에서 직접 상태를 가져옵니다 (Hook 아님)
    const authStore = useAuthStore.getState();
    const userStore = useUserStore.getState();

    if (!authStore.isAuthenticated) {
      try {
        const { accessToken } = await refreshAccessTokenApi();
        authStore.setAccessToken(accessToken);
      } catch (error) {
        // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
        throw redirect({
          to: '/login',
          search: { redirect: location.href },
        });
      }
    }

    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    if (!userStore.userInfo) {
      try {
        const userData = await getUserInfoApi();
        userStore.setUserInfo(userData);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        // 유저 정보를 가져오지 못하면 정상적인 서비스 이용이 어려우므로 로그아웃 처리
        authStore.clearAuth();
        userStore.clearUserInfo();
        throw redirect({ to: '/login' });
      }
    }
  },
  component: MainLayout,
});
