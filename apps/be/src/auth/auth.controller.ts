import { Body, Controller, HttpCode, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';
import { type CreateUserDto, CreateUserSchema } from '@/users/schemas/create-user.schema';
import { UserResponseSchema } from '@/users/schemas/user-response.schema';

import { AuthService } from './auth.service';
import { type LoginDto, LoginSchema } from './schemas/login.schema';
import type { Response } from 'express';

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

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인', description: 'Access/Refresh Token 발급' })
  @ApiBody({ schema: zodSchemaToOpenAPI(LoginSchema) })
  @ApiResponse({ status: 200, description: '성공' })
  async login(
    @Request() req,
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // JS에서 접근 불가능 (XSS 방어)
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송 (배포 시 필수)
      sameSite: 'lax', // CSRF 방어 (Strict는 UX 이슈가 있을 수 있어 보통 Lax 사용)
      path: '/auth', // 모든 경로에서 유효
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14일 (밀리초 단위)
    });

    return {
      accessToken,
    };
  }
}
