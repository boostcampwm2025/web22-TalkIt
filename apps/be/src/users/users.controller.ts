import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';

@ApiTags('User')
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 중복 검사 API
  @Get('check-duplicate')
  @ApiOperation({
    summary: '이메일/닉네임 중복 검사',
    description: '회원가입 전 이메일 또는 닉네임이 이미 사용 중인지 확인합니다.',
  })
  @ApiQuery({
    name: 'type',
    description: '검사할 항목 (email 또는 nickname)',
    enum: ['email', 'nickname'],
    required: true,
  })
  @ApiQuery({
    name: 'value',
    description: '검사할 값 (이메일 주소 또는 닉네임 문자열)',
    required: true,
    example: 'test@example.com',
  })
  @ApiResponse({
    status: 200,
    description: '중복 검사 성공',
    schema: {
      type: 'object',
      properties: {
        isDuplicate: {
          type: 'boolean',
          description: 'true면 중복(사용 불가), false면 사용 가능',
          example: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 (type 파라미터 오류 등)',
  })
  async checkDuplicate(@Query('type') type: string, @Query('value') value: string) {
    if (type !== 'email' && type !== 'nickname') {
      throw new BadRequestException('타입은 반드시 email 혹은 nickname 이어야 합니다.');
    }

    const isDuplicate = await this.usersService.checkDuplicate(type, value);
    return { isDuplicate };
  }
}
