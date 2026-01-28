import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // 이메일로 유저 찾기
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // 닉네임으로 유저 찾기
  async findByNickname(nickname: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { nickname } });
  }

  // 유저 생성 (트랜잭션 지원, 실패 시 롤백)
  async createUserWithAuth(
    userData: Prisma.UserCreateInput,
    authData: Omit<Prisma.UserOAuthUncheckedCreateInput, 'userId'>,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      // 유저 생성
      const user = await tx.user.create({
        data: {
          ...userData,
          stats: {
            create: {
              level: 1,
              currentXp: 0,
              streakDays: 0,
              totalSolvedQuestions: 0,
              totalStudyTimeSec: 0,
            },
          },
          creditHistory: {
            create: {
              amount: 20,
              reason: '신규유저 크레딧 지급',
            },
          },
        },
      });

      // 인증 정보(UserOAuth) 생성
      // User가 생성된 후 ID를 연결
      await tx.userOAuth.create({
        data: {
          ...authData, // provider, providerUserId, passwordHash
          userId: user.id,
        },
      });

      return user;
    });
  }

  // 이메일을 통해 UserOAuth 포함 조회
  async findByEmailWithAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        oauthAccounts: true,
      },
    });
  }

  // 리프레쉬 토큰 컬럼 업데이트
  async updateRefreshToken(userId: number, refreshToken: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentRefreshToken: refreshToken },
    });
  }
}
