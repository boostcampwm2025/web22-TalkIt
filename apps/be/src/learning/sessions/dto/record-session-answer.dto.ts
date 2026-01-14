import { ApiProperty } from '@nestjs/swagger';

import { IsString } from 'class-validator';

export class RecordSessionAnswerDto {
  @ApiProperty({
    example: '101',
    description: '문제 ID (multipart/form-data 특성상 string으로 전달됨)',
  })
  @IsString()
  questionId!: string;
}
