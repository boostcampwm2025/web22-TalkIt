import { SideBar, SideBarMobile } from '@/components/SideBar';
import GlobalModal from '@/components/global-modal';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootLayout = () => {
  return (
    <>
      <div className="flex h-screen">
        <SideBar />

        {/* 모바일 화면에서 아래 탭 바 */}
        <SideBarMobile />

        {/* 메인 콘텐츠 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalModal />

      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
