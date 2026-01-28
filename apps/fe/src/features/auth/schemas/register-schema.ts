import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const CreateUserSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해주세요.')
      .email({ message: '이메일 형식이 올바르지 않습니다.' }),
    nickname: z
      .string()
      .min(2, '닉네임은 2글자 이상이어야 합니다.')
      .max(10, '닉네임은 10글자 이하여야 합니다.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').regex(passwordRegex, {
      message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    }),
    confirmPassword: z.string().min(1, '비밀번호를 다시 입력해주세요.'),
    termsAgreed: z.literal(true, {
      message: '이용약관에 동의해주세요.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
