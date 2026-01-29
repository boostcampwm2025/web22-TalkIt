import type { LoginDto, RegisterFormDto } from '@repo/shared/schemas/auth';
import type { AuthResponseDto } from '@repo/shared/types/user';

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
export const registerUser = async (data: RegisterFormDto) => {
  // 프론트에서만 사용되는 입력 빼고 payload로 추출
  const { confirmPassword, termsAgreed, ...payload } = data;

  const { data: responseData } = await axiosInstance.post<void>('/auth/register', payload);
  return responseData;
};

// 로그인
export const loginUser = async (data: LoginDto) => {
  const { data: responseData } = await axiosInstance.post<AuthResponseDto>('/auth/login', data);
  return responseData;
};

// 로그아웃
export const logoutUser = async () => {
  await axiosInstance.post('/auth/logout');
};

// 토큰 재발급
export const refreshAccessTokenApi = async () => {
  const { data } = await axiosInstance.post<AuthResponseDto>('/auth/refresh');
  return data;
};
