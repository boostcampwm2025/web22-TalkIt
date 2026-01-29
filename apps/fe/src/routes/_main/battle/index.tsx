import PrepareImage from '@/assets/prepare.png';
import { createFileRoute } from '@tanstack/react-router';

const BattlePage = () => {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-6 p-6">
      {/* 마스코트 이미지 영역 */}
      <div className="relative flex w-full max-w-80 items-center justify-center md:max-w-80">
        <img
          src={PrepareImage}
          alt="준비중 마스코트"
          className="h-auto w-full object-contain drop-shadow-sm transition-transform duration-500 hover:scale-105"
        />
      </div>

      {/* 안내 문구 영역 */}
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-black md:text-3xl">준비 중인 페이지입니다!</h2>
        <p className="text-sm text-dark-gray md:text-base">
          더 좋은 서비스를 위해 열심히 준비하고 있어요.
          <br className="hidden sm:block" />
          조금만 기다려주세요!
        </p>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_main/battle/')({
  component: BattlePage,
});
