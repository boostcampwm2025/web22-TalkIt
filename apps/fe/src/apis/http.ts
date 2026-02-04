import { ENV } from '@/constants/env';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { useUserStore } from '@/lib/stores/user-store';

import { refreshAccessTokenApi } from './auth-api';
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Auth Store에서 토큰만 가져옴
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// TODO: [응답 인터셉터] 에러 공통 처리
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // refresh 요청 경로에서 401이 뜬거면 무한 루프 방지를 위해 바로 실패 처리
      if (originalRequest.url?.includes('/auth/refresh')) {
        handleAuthError();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // 1. 토큰 재발급 시도
        const { accessToken } = await refreshAccessTokenApi();

        useAuthStore.getState().setAccessToken(accessToken);

        // 실패했던 원래 요청의 헤더를 새 토큰으로 교체
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        handleAuthError();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// 인증 에러 공통 처리 함수
const handleAuthError = () => {
  useAuthStore.getState().clearAuth();
  useUserStore.getState().clearUserInfo();

  const currentPath = window.location.pathname;
  const publicPaths = ['/learning', '/mypage', '/ranking', '/battle'];

  // 현재 경로가 공개 페이지가 아닐 때만 로그인 페이지로 이동
  if (publicPaths.includes(currentPath)) {
    window.location.href = '/login';
  }
};
export default axiosInstance;
