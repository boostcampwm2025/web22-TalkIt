export const ENV = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
} as const;
