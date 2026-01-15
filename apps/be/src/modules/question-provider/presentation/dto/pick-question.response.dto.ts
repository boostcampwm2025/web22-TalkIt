import { Difficulty, Domain } from '@/common/enums/learning.enum';

// 응답 DTO: guide는 포함하지 않음 (AGENT.md 규칙)
export class PickQuestionResponseDto {
  questionId!: number | string;
  domain!: Domain;
  difficulty!: Difficulty;
  topicId!: string;
  content!: string;
  mustInclude!: string[];
  timeLimitSec!: number;
}
