import { Footer } from '@/components/Footer';
import { TopBar } from '@/components/TopBar';
import { Outlet, createFileRoute } from '@tanstack/react-router';

const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 상단 헤더 (Top Bar) */}
      <TopBar />

      {/* 콘텐츠 영역 */}
      <main className="flex flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});
