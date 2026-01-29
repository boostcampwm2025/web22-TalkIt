import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
  // State
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  finishInitializing: () => void;
  clearAuth: () => void; // 로그아웃 시 호출
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: !!token }, false, 'auth/setAccessToken'),

      finishInitializing: () => set({ isInitializing: false }, false, 'auth/finishInitializing'),

      clearAuth: () => set({ accessToken: null, isAuthenticated: false }, false, 'auth/clearAuth'),
    }),
    { name: 'AuthStore' },
  ),
);
