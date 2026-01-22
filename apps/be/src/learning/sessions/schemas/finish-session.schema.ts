import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { z } from 'zod';

// 질문 결과 스키마
const QuestionResultSchema = z.object({
  content: z.string().describe('질문 내용'),
  type: z.enum(['NORMAL', 'TAIL']).describe('질문 유형'),
  score: z.number().int().min(0).max(100).describe('질문 점수 (0~100)'),
});

// 획득 경험치 상세 내역 스키마
const GainedXpDetailSchema = z.object({
  baseXp: z.number().int().describe('기본 경험치 (답변 점수 합계)'),
  difficultyBonus: z.number().int().nullable().describe('난이도 보너스'),
  deepDiveBonus: z.number().int().nullable().describe('심화 학습(꼬리질문) 보너스'),
});

// 세션 종료 응답 메인 스키마
export const FinishSessionResponseSchema = z.object({
  currentXp: z.number().int().describe('현재 경험치 (세션 종료 후)'),

  prevRequiredXpForNextLevel: z
    .number()
    .int()
    .describe('직전 레벨업 요구 경험치 (UI 게이지 시작점용)'),

  requiredXpForNextLevel: z.number().int().describe('다음 레벨업 요구 경험치 (UI 게이지 끝점용)'),

  level: z.number().int().describe('현재 레벨'),

  gainedXp: GainedXpDetailSchema.describe('경험치 획득 상세 내역'),

  category: z.enum(Object.values(Domain) as [Domain, ...Domain[]]).describe('학습 카테고리'),

  difficulty: z
    .enum(Object.values(Difficulty) as [Difficulty, ...Difficulty[]])
    .describe('학습 난이도'),

  questions: z.array(QuestionResultSchema).describe('세션에서 답변한 질문 목록'),
});

// 타입 추출 (DTO)
export type FinishSessionResponseDto = z.infer<typeof FinishSessionResponseSchema>;
export type QuestionResultDto = z.infer<typeof QuestionResultSchema>;
export type GainedXpDetailDto = z.infer<typeof GainedXpDetailSchema>;
