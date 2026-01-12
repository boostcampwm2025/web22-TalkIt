import { IsString } from 'class-validator';

export class RecordSessionAnswerDto {
  @IsString()
  questionId!: string;
}
