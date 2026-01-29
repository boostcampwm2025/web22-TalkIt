import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { XpRepository } from '@/learning/xp/repository/xp.repository';
import { CreateUserDto } from '@repo/shared/schemas/auth';
import { UserInfoResponseDto } from '@repo/shared/types/user';

import { UserCreditsRepository } from './credits/user-credits.repository';
import { UserStatsRepository } from './stats/repository/user-stats.repository';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userStatsRepository: UserStatsRepository,
    private readonly xpRepository: XpRepository,
    private readonly userCreditsRepository: UserCreditsRepository,
  ) {}

  // 이메일 또는 닉네임 중복 검사
  async checkDuplicate(type: 'email' | 'nickname', value: string): Promise<boolean> {
    const user =
      type === 'email'
        ? await this.usersRepository.findByEmail(value)
        : await this.usersRepository.findByNickname(value);

    return !!user;
  }

  // 회원가입
  async create(dto: CreateUserDto) {
    // 중복 검사 (Double Check)
    const emailExists = await this.checkDuplicate('email', dto.email);
    if (emailExists) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const nicknameExists = await this.checkDuplicate('nickname', dto.nickname);
    if (nicknameExists) {
      throw new ConflictException('이미 존재하는 닉네임입니다.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // DB 저장
    try {
      const newUser = await this.usersRepository.createUserWithAuth(
        {
          email: dto.email,
          nickname: dto.nickname,
        },
        {
          provider: 'local',
          providerUserId: dto.email,
          passwordHash: hashedPassword,
        },
      );

      return newUser;
    } catch (error) {
      // Todo: 에러 로깅 처리
      throw new InternalServerErrorException('회원가입 중 알 수 없는 오류가 발생했습니다.');
    }
  }

  // 사용자 정보 조회 서비스 로직
  async getMyProfile(userId: number): Promise<UserInfoResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 학습 통계 정보 조회
    const stats = await this.userStatsRepository.findStatsByUserId(userId);

    const currentLevel = stats?.level ?? 1;
    const currentXp = stats?.currentXp ?? 0;

    // 다음 레벨업을 위한 필요 경험치 조회
    const nextLevel = currentLevel + 1;
    const requiredXpForNextLevel = await this.xpRepository.findRequiredXpByLevel(nextLevel);

    // 현재 보유 크레딧 수 조회
    const remainingCredit = await this.userCreditsRepository.getTotalCredit(userId);

    // 소셜 정보 (Follow 모델 미구현 상태이므로 0 처리)
    const socialStats = {
      followerCount: 0,
      followingCount: 0,
    };

    return {
      profile: {
        nickname: user.nickname,
        profileImage: user.profileImageUrl,
        bio: user.bio || '',
      },
      progression: {
        level: currentLevel,
        currentXp: currentXp,
        requiredXpForNextLevel: requiredXpForNextLevel,
        lp: 0, // 래더 포인트 (배틀 미구현에 따라 0 응답)
      },
      studyStats: {
        solvedProblemCount: stats?.totalSolvedQuestions ?? 0,
        streak: stats?.streakDays ?? 0,
        totalStudyTime: stats?.totalStudyTimeSec ?? 0,
      },
      social: {
        followerCount: socialStats.followerCount,
        followCount: socialStats.followingCount,
      },

      remainingCredit: remainingCredit,
    };
  }
}
