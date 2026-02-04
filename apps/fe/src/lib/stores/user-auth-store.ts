import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
  // State
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isTermsAgreed: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  finishInitializing: () => void;
  clearAuth: () => void; // 로그아웃 시 호출
  setTermsAgreed: (agreed: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,
      isTermsAgreed: false,

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: !!token }, false, 'auth/setAccessToken'),

      finishInitializing: () => set({ isInitializing: false }, false, 'auth/finishInitializing'),

      clearAuth: () => set({ accessToken: null, isAuthenticated: false }, false, 'auth/clearAuth'),
      setTermsAgreed: (agreed) => set({ isTermsAgreed: agreed }, false, 'auth/setTermsAgreed'),
    }),
    { name: 'AuthStore' },
  ),
);
