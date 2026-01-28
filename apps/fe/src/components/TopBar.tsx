import { Link } from '@tanstack/react-router';

import { AudioWaveform } from 'lucide-react';

export const TopBar = () => {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray bg-white px-4 shadow-sm md:px-8">
      <Link to="/" className="group flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/10">
          <AudioWaveform size={20} strokeWidth={2.5} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-black">Talk It</span>
      </Link>

      <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
};
