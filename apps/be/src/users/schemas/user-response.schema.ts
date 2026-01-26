import { z } from 'zod';

export const UserResponseSchema = z.object({
  id: z.number().describe('사용자 고유 ID'),
  email: z.string().describe('사용자 이메일'),
  nickname: z.string().describe('사용자 닉네임'),
  profileImageUrl: z.string().nullable().describe('프로필 이미지 URL'),
  createdAt: z.date().describe('가입 일시'),
});

export type UserResponseDto = z.infer<typeof UserResponseSchema>;
