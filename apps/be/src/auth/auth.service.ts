import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';
import { type CreateUserDto } from '@repo/shared/schemas/auth';

import { JwtPayload } from './types/jwt-payload-type';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 회원가입 로직 (UsersService에게 일임)
  async register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // 유저 검증 로직 (아이디/비번 맞는지 확인)
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersRepository.findByEmailWithAuth(email);

    if (!user) return null;

    // 'local'로 가입한 인증 정보 찾기
    const localAuth = user.oauthAccounts.find((o) => o.provider === 'local');

    // 비밀번호 검증 (로컬 로그인의 경우에만)
    if (
      localAuth &&
      localAuth.passwordHash &&
      (await bcrypt.compare(pass, localAuth.passwordHash))
    ) {
      const { oauthAccounts, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const tokens = await this.getTokens(user.id, user.nickname, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async rotateRefreshToken(userId: number, oldRefreshToken: string) {
    const user = await this.usersRepository.findById(userId);

    // 유저가 없거나, DB에 저장된 토큰이 없는 경우 (로그아웃 된 상태)
    if (!user || !user.currentRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    // 사용자가 보낸 토큰과 DB의 해시값 비교
    const isRefreshTokenMatching = await bcrypt.compare(oldRefreshToken, user.currentRefreshToken);

    if (!isRefreshTokenMatching) {
      throw new UnauthorizedException('Invalid Refresh Token');
    }

    // 새로운 토큰 쌍 발급
    const tokens = await this.getTokens(userId, user.nickname, user.email || '');

    await this.updateRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  // 로그아웃
  async logout(userId: number) {
    await this.usersRepository.updateRefreshToken(userId, null);
  }

  // 토큰 생성 헬퍼 함수
  private async getTokens(userId: number, nickname: string, email?: string) {
    const payload: JwtPayload = {
      sub: userId,
      nickname,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRATION_TIME') as any,
      }),

      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRATION_TIME') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  // DB 리프레시 토큰 업데이트 헬퍼 함수
  private async updateRefreshToken(userId: number, refreshToken: string | null) {
    let hashedRefreshToken: string | null = null;

    // null이 아닐 경우(재발급) 새로운 토큰 해싱하고 업데이트
    if (refreshToken) {
      hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    }

    await this.usersRepository.updateRefreshToken(userId, hashedRefreshToken);
  }
}
