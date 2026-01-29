import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '내 프로필 정보 조회',
    description: '로그인한 사용자의 프로필, 통계(XP, 레벨), 소셜 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    schema: {
      example: {
        profile: {
          nickname: 'TalkItTester',
          profileImage: 'https://via.placeholder.com/150',
          bio: '개발 중인 테스트 계정입니다.',
        },
        progression: {
          level: 1,
          currentXp: 0,
          requiredXpForNextLevel: 1000,
          lp: 0,
        },
        studyStats: {
          solvedProblemCount: 0,
          streak: 0,
          totalStudyTime: 0,
        },
        social: {
          followerCount: 0,
          followingCount: 0,
        },
        remainingCredit: 0,
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getMyProfile(@ActiveUser() user: { id: number }) {
    return this.usersService.getMyProfile(user.id);
  }
}
