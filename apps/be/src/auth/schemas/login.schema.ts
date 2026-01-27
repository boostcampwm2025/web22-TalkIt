import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

// DTO 타입 추출
export type LoginDto = z.infer<typeof LoginSchema>;
