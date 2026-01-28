import type { CreateUserDto } from '@/features/auth/schemas/register-schema';

import axiosInstance from './http';

export type CheckDuplicateResponse = {
  isDuplicate: boolean;
};

// 이메일 중복 확인
export const checkEmailDuplicate = async (email: string) => {
  const { data } = await axiosInstance.get<CheckDuplicateResponse>('/users/check-duplicate', {
    params: {
      type: 'email',
      value: email,
    },
  });
  return data;
};

// 닉네임 중복 확인
export const checkNicknameDuplicate = async (nickname: string) => {
  const { data } = await axiosInstance.get<CheckDuplicateResponse>('/users/check-duplicate', {
    params: {
      type: 'nickname',
      value: nickname,
    },
  });
  return data;
};

// 회원가입
export const registerUser = async (data: CreateUserDto) => {
  // 프론트에서만 사용되는 입력 빼고 payload로 추출
  const { confirmPassword, termsAgreed, ...payload } = data;

  const { data: responseData } = await axiosInstance.post<void>('/auth/register', payload);
  return responseData;
};
