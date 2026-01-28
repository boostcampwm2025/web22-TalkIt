import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const CreateUserSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email({ message: '이메일 형식이 올바르지 않습니다.' }),
  nickname: z
    .string()
    .trim()
    .min(2, '닉네임은 2글자 이상이어야 합니다.')
    .max(10, '닉네임은 10글자 이하여야 합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').regex(passwordRegex, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  }),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
