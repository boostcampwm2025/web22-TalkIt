import { SideBar, SideBarMobile } from '@/components/SideBar';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const NotFoundComponent = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        gap: '24px',
        padding: '20px',
      }}
    >
      {/* 안내 문구 */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
          앗! 페이지를 찾을 수 없어요.
        </h2>
        <p style={{ color: '#888', lineHeight: '1.5' }}>
          요청하신 페이지가 주소가 변경되었거나 삭제되었을 수 있습니다.
          <br />
          입력하신 주소가 정확한지 다시 한번 확인해주세요.
        </p>

        <a
          href="/learning"
          style={{
            display: 'inline-block',
            marginTop: '24px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
};

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

      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundComponent,
});
