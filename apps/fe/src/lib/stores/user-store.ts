import type { UserInfoResponseDto } from '@repo/shared/types/user';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type UserState = {
  userInfo: UserInfoResponseDto | null;
  setUserInfo: (info: UserInfoResponseDto) => void;
  clearUserInfo: () => void;
  updateCredit: (amount: number) => void;
};

// 사용자 정보 상태 전역 상태 store
export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      userInfo: null,
      setUserInfo: (userInfo) => set({ userInfo }, false, 'userInfo/setUserInfo'),
      clearUserInfo: () => set({ userInfo: null }, false, 'userInfo/clearUserInfo'),
      updateCredit: (amount) =>
        set(
          (state) => ({
            userInfo: state.userInfo ? { ...state.userInfo, remainingCredit: amount } : null,
          }),
          false,
          'user/updateCredit',
        ),
    }),
    { name: 'UserStore' },
  ),
);
