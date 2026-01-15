import { z } from 'zod';

export const RecordSessionAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId는 필수입니다'),
});

//타입은 Zod에서 바로 추론
export type RecordSessionAnswerDto = z.infer<typeof RecordSessionAnswerSchema>;
