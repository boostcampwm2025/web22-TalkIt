import { refreshAccessTokenApi } from '@/apis/auth-api';

import { useUserStore } from './user-store';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
  // State
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void; // 로그아웃 시 호출
  checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: !!token }, false, 'auth/setAccessToken'),

      clearAuth: () => set({ accessToken: null, isAuthenticated: false }, false, 'auth/clearAuth'),

      checkAuth: async () => {
        try {
          const { accessToken } = await refreshAccessTokenApi();
          set({
            accessToken,
            isAuthenticated: true,
            isInitializing: false, // 확인 완료 (성공)
          });
          useUserStore.getState().fetchUserInfo();
        } catch (error) {
          set({
            accessToken: null,
            isAuthenticated: false,
            isInitializing: false, // 확인 완료 (실패 -> 비로그인)
          });
        }
      },
    }),
    { name: 'AuthStore' },
  ),
);
