import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';
import { type CreateUserDto, CreateUserSchema } from '@/users/schemas/create-user.schema';
import { UserResponseSchema } from '@/users/schemas/user-response.schema';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 회원가입 API
  @Post('register')
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
      },
    },
  })
  @ApiBadRequestResponse({
    description: '유효성 검사 실패 (비밀번호 정규식 미준수 등)',
    schema: {
      example: {
        statusCode: 400,
        message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
      },
    },
  })
  async register(
    @Body(new ZodValidationPipe(CreateUserSchema))
    createUserDto: CreateUserDto,
  ) {
    const newUser = await this.authService.register(createUserDto);

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
