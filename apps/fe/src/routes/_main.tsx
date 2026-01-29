import { SideBar, SideBarMobile } from '@/components/SideBar';
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
  beforeLoad: ({ location }) => {
    // 1. Zustand 스토어에서 직접 상태를 가져옵니다 (Hook 아님)
    const userInfo = useUserStore.getState().userInfo;

    // 2. 인증되지 않은 경우 로그인 페이지로 리다이렉트
    if (!userInfo) {
      throw redirect({
        to: '/login', // 로그인 페이지 경로
        search: {
          // 로그인 후 원래 페이지로 돌아오기 위해 현재 경로를 저장
          redirect: location.href,
        },
      });
    }
  },
  component: MainLayout,
});
