import type { UserInfoResponseDto } from '@repo/shared/types/user';

import { create } from 'zustand';

const mockUserData: UserInfoResponseDto = {
  profile: {
    nickname: '코딩하는토끼',
    profileImage: 'https://s3.ap-northeast-2.amazonaws.com/talkit/profiles/user_123.png',
    bio: '안녕하세요, 백엔드 마스터를 꿈꾸는 개발자입니다.',
  },
  progression: {
    level: 12,
    currentXp: 450,
    requiredXpForNextLevel: 1200,
    lp: 1422,
  },
  studyStats: {
    solvedProblemCount: 128,
    streak: 5,
    totalStudyTime: 360,
  },
  social: {
    followerCount: 42,
    followCount: 15,
  },
  remainingCredit: 9,
};

// todo: 추후 mock 데이터 제거 후 아래 null로 초기 상태값 세팅하도록 변경하면 됩니다.
// const initialUserData: UserInfoResponseDto = {
//   profile: null,
//   progression: null,
//   studyStats: null,
//   social: null,
//   remainingCredit: null,
// };

type UserState = {
  userInfo: UserInfoResponseDto;
  setUserInfo: (info: UserInfoResponseDto) => void;
  updateCredit: (amount: number) => void;
};

// 사용자 정보 상태 전역 상태 store
export const useUserStore = create<UserState>((set) => ({
  userInfo: mockUserData,

  setUserInfo: (info) => set({ userInfo: info }),

  updateCredit: (amount) =>
    set((state) => ({
      userInfo: { ...state.userInfo, remainingCredit: amount },
    })),
}));
