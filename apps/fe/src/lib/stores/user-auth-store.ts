import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
  // State
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void; // 로그아웃 시 호출
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: !!token }, false, 'auth/setAccessToken'),

      clearAuth: () => set({ accessToken: null, isAuthenticated: false }, false, 'auth/clearAuth'),
    }),
    { name: 'AuthStore' },
  ),
);
