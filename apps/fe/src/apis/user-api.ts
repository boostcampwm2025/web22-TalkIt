import type { UserInfoResponseDto } from '@repo/shared/types/user';

import axiosInstance from './http';

export const getUserInfoApi = async () => {
  const { data } = await axiosInstance.get<UserInfoResponseDto>('/users/me');
  return data;
};
