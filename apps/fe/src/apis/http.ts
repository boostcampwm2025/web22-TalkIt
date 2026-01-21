import axios, { type AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 타임아웃 30초 (개발하면서 적절하게 수정)
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: [요청 인터셉터] 토큰 주입 등 공통 로직

// TODO: [응답 인터셉터] 에러 공통 처리

export default axiosInstance;
