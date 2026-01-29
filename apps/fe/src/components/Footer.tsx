import { AudioWaveform } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="flex items-center justify-between gap-2 border-t border-t-gray bg-white px-8 py-6 text-sm text-dark-gray">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/10">
          <AudioWaveform size={16} strokeWidth={2.5} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-black">Talk It</span>
      </div>

      <p>© 2026 Talk It. All rights reserved.</p>
    </footer>
  );
};
