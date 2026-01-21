import { ENV } from '@/constants/env';

import axios, { type AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: [요청 인터셉터] 토큰 주입 등 공통 로직

// TODO: [응답 인터셉터] 에러 공통 처리

export default axiosInstance;
