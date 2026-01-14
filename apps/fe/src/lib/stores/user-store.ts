import type { UserInfoResponseDto } from '@repo/shared/types/user';

import { create } from 'zustand';

const MOCK_USER_DATA: UserInfoResponseDto = {
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

// const INITIAL_USER_DATA: UserInfoResponseDto = {
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

export const useUserStore = create<UserState>((set) => ({
  userInfo: MOCK_USER_DATA,

  setUserInfo: (info) => set({ userInfo: info }),

  updateCredit: (amount) =>
    set((state) => ({
      userInfo: { ...state.userInfo, remainingCredit: amount },
    })),
}));
