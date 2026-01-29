import { z } from 'zod';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

const UserBase = z.object({
  // 이메일: 어디서든 형식이 같으므로 Base에 정의
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email({ message: '이메일 형식이 올바르지 않습니다.' }),

  // 닉네임: 회원가입, 정보수정 등에서 쓰임
  nickname: z
    .string()
    .trim()
    .min(2, '닉네임은 2글자 이상이어야 합니다.')
    .max(10, '닉네임은 10글자 이하여야 합니다.'),

  // '엄격한' 비밀번호: 회원가입용 (Regex 포함)
  strictPassword: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').regex(PASSWORD_REGEX, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  }),
});

export const LoginSchema = UserBase.pick({
  email: true,
}).extend({
  password: z.string().min(1, '비밀번호를 입력해주세요.'), // 비밀번호 규칙 재정의
});

export type LoginDto = z.infer<typeof LoginSchema>;

// 백엔드용 유저 생성 스키마
export const CreateUserSchema = z.object({
  email: UserBase.shape.email,
  nickname: UserBase.shape.nickname,
  password: UserBase.shape.strictPassword,
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

// 프론트엔드용 회원가입 스키마
export const RegisterFormSchema = CreateUserSchema.extend({
  confirmPassword: z.string().min(1, '비밀번호를 다시 입력해주세요.'),
  termsAgreed: z.literal(true, {
    message: '이용약관에 동의해주세요.',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

export type RegisterFormDto = z.infer<typeof RegisterFormSchema>;
