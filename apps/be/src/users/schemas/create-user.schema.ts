import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const CreateUserSchema = z.object({
  email: z.string().email({ message: '이메일 형식이 올바르지 않습니다.' }),
  nickname: z.string().min(2).max(10),
  password: z.string().min(8).regex(passwordRegex, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  }),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
