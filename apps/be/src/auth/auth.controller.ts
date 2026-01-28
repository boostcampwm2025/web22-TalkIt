import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';
import { type CreateUserDto, CreateUserSchema } from '@/users/schemas/create-user.schema';
import { UserResponseSchema } from '@/users/schemas/user-response.schema';

import { AuthService } from './auth.service';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
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
        code: 'ConflictException',
        message: '이미 존재하는 이메일입니다.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '유효성 검사 실패 (비밀번호 정규식 미준수 등)',
    schema: {
      example: {
        code: 'BadRequestException',
        message: '유효성 검사에 실패했습니다.',
        errors: {
          password: [
            'Too small: expected string to have >=8 characters',
            '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
          ],
        },
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
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT Access Token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
    schema: {
      example: {
        code: 'UnauthorizedException',
        message: '이메일 또는 비밀번호가 일치하지 않습니다.',
      },
    },
  })
  async login(
    @Request() req,
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiCookieAuth('refresh-token')
  @ApiOperation({
    summary: '토큰 재발급 (Refresh)',
    description: '쿠키의 Refresh Token을 이용해 새로운 토큰을 발급받습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '재발급 성공 (새 Access Token 반환)',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: '새로 발급된 JWT Access Token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않거나 만료된 Refresh Token',
    schema: {
      example: {
        code: 'UnauthorizedException',
        message: 'Unauthorized',
      },
    },
  })
  async refresh(
    @ActiveUser() user: ActiveUser & { refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.rotateRefreshToken(
      user.id,
      user.refreshToken,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiCookieAuth('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: '서버의 Refresh Token을 삭제하고 클라이언트 쿠키를 만료시킵니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: '성공적으로 로그아웃 되었습니다.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않거나 만료된 Refresh Token',
    schema: {
      example: {
        code: 'UnauthorizedException',
        message: 'Unauthorized',
      },
    },
  })
  async logout(@ActiveUser() user: ActiveUser, @Res({ passthrough: true }) res: Response) {
    // DB에서 리프레시 토큰 삭제
    await this.authService.logout(user.id);

    // 클라이언트 쿠키 삭제
    res.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { message: '성공적으로 로그아웃 되었습니다.' };
  }
}
