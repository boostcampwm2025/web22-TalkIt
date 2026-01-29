import { ENV } from '@/constants/env';
import { useAuthStore } from '@/lib/stores/user-auth-store';

import axios, { type AxiosInstance } from 'axios';

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
  async (error) => {
    // TODO: 401 Unauthorized 에러 발생 시 토큰 재발급(Silent Refresh) 로직
    // 백엔드의 GET /auth/refresh 엔드포인트를 호출 (Task 3-3-4)

    return Promise.reject(error);
  },
);
export default axiosInstance;
