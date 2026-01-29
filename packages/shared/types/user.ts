export type Profile = {
  nickname: string;
  profileImage: string | null;
  bio: string;
};

export type Progression = {
  level: number;
  currentXp: number;
  requiredXpForNextLevel: number;
  lp: number;
};

export type StudyStats = {
  solvedProblemCount: number;
  streak: number; // day
  totalStudyTime: number; // second
};

export type Social = {
  followerCount: number;
  followCount: number;
};

export type UserInfoResponseDto = {
  profile: Profile;
  progression: Progression;
  studyStats: StudyStats;
  social: Social;
  remainingCredit: number;
};

export type AuthResponseDto = {
  accessToken: string;
};

export type RegisterResponseDto = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string;
  createdAt: string;
};
