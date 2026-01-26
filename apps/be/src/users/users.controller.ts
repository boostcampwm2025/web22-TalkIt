import { BadRequestException, Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { type CreateUserDto, CreateUserSchema } from './schemas/create-user.schema';
import { UserResponseSchema } from './schemas/user-response.schema';
import { UsersService } from './users.service';

@ApiTags('User - Auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 중복 검사 API
  @Get('check')
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

  // 회원가입 API
  @Post()
  @ApiOperation({
    summary: '회원가입',
    description: '새로운 사용자를 생성하고 초기 크레딧과 통계 정보를 초기화합니다.',
  })
  @ApiBody({
    description: '회원가입 정보',
    schema: zodSchemaToOpenAPI(CreateUserSchema),
  })
  @ApiCreatedResponse({
    description: '회원가입 성공',
    schema: zodSchemaToOpenAPI(UserResponseSchema),
  })
  @ApiConflictResponse({
    description: '이미 존재하는 이메일 또는 닉네임',
    schema: {
      example: {
        statusCode: 409,
        message: '이미 존재하는 이메일입니다.',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '유효성 검사 실패 (비밀번호 정규식 미준수 등)',
  })
  async register(
    @Body(new ZodValidationPipe(CreateUserSchema))
    createUserDto: CreateUserDto,
  ) {
    const newUser = await this.usersService.create(createUserDto);

    // 응답 DTO 매핑
    return {
      id: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      profileImageUrl: newUser.profileImageUrl,
      createdAt: newUser.createdAt,
    };
  }
}
