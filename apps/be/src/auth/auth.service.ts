import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { type CreateUserDto } from '@/users/schemas/create-user.schema';
import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';

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
    const payload = { sub: user.id, email: user.email }; // 토큰에 담을 정보

    // Access Token 생성
    const accessToken = this.jwtService.sign(payload);

    // Refresh Token 생성 (별도 시크릿 사용)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION_TIME'),
    });

    // Refresh Token 해싱 후 DB 저장
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }
}
