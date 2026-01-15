import { ApiProperty } from '@nestjs/swagger';

import { LearningCategory } from '@/common/enums/learning-category.enum';
import { LearningDifficulty } from '@/common/enums/learning-difficulty.enum';

import { IsEnum } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: '학습 주제',
    enum: LearningCategory,
    example: LearningCategory.OS,
  })
  @IsEnum(LearningCategory)
  category!: LearningCategory;

  @ApiProperty({
    description: '학습 난이도',
    enum: LearningDifficulty,
    example: LearningDifficulty.MEDIUM,
  })
  @IsEnum(LearningDifficulty)
  difficulty!: LearningDifficulty;
}
