// routes/_main.tsx
import { SideBar, SideBarMobile } from '@/components/SideBar';
// 경로에 맞게 수정
import { Outlet, createFileRoute } from '@tanstack/react-router';

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
  component: MainLayout,
});
