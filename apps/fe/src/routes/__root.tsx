import { Footer } from '@/components/Footer';
import { TopBar } from '@/components/TopBar';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const NotFoundComponent = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      {/* 안내 문구 */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-2xl font-bold">앗! 페이지를 찾을 수 없어요.</h2>
        <p className="leading-6 text-dark-gray">
          요청하신 페이지가 주소가 변경되었거나 삭제되었을 수 있습니다.
          <br />
          입력하신 주소가 정확한지 다시 한번 확인해주세요.
        </p>

        <a
          href="/learning"
          className="mt-6 inline-block rounded-sm bg-primary px-5 py-2.5 font-bold text-white no-underline"
        >
          홈으로 돌아가기
        </a>
      </div>
      <Footer />
    </div>
  );
};

const RootLayout = () => {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundComponent,
});
