import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { IsEnum, IsNotEmpty } from 'class-validator';

// 클라이언트에서 질문을 요청할 때 사용하는 DTO
export class PickQuestionRequestDto {
  @IsNotEmpty()
  @IsEnum(Domain)
  domain!: Domain;

  @IsNotEmpty()
  @IsEnum(Difficulty)
  difficulty!: Difficulty;
}
