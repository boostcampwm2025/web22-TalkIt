import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-pale-blue px-4 py-10">
      <section className="w-full max-w-120 rounded-2xl bg-white p-6 shadow-sm sm:p-12">
        {children}
      </section>
    </main>
  );
};
