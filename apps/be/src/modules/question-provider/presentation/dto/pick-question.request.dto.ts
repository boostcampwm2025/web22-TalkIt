import { IsEnum, IsNotEmpty } from 'class-validator';

// 도메인과 난이도 열거형은 AGENT.md 기준으로 고정
export enum Domain {
  OS = 'OS',
  NETWORK = 'NETWORK',
  DB = 'DB',
  DATA_STRUCTURE = 'DATA_STRUCTURE',
}

export enum Difficulty {
  EAZY = 'EAZY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

// 클라이언트에서 질문을 요청할 때 사용하는 DTO
export class PickQuestionRequestDto {
  @IsNotEmpty()
  @IsEnum(Domain)
  domain!: Domain;

  @IsNotEmpty()
  @IsEnum(Difficulty)
  difficulty!: Difficulty;
}
