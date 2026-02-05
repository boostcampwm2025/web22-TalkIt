import { z } from 'zod';

// 요청 DTO(AssessRequestDto)에 대응하는 Zod 스키마 정의
// - 두 ID 중 정확히 하나만 필수(XOR)
// - ID는 양의 정수, 체류 시간은 0 이상의 정수
export const AssessRequestSchema = z
  .object({
    questionId: z.number().int().positive().optional(),
    extraQuestionId: z.number().int().positive().optional(),
    answerText: z.string().min(1),
    timeSpentSec: z.number().int().min(0),
  })
  .refine(
    (data) => {
      const hasQuestionId = data.questionId !== undefined;
      const hasExtraQuestionId = data.extraQuestionId !== undefined;
      return (hasQuestionId ? 1 : 0) + (hasExtraQuestionId ? 1 : 0) === 1;
    },
    {
      message: 'questionId 또는 extraQuestionId 중 정확히 하나만 제공해야 합니다.',
      path: ['questionId'],
    },
  );
