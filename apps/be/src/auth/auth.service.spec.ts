import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';

import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

// Mocking dependencies (가짜 객체 정의)
const mockUsersService = {
  create: jest.fn(),
};

const mockUsersRepository = {
  findByEmailWithAuth: jest.fn(),
  findById: jest.fn(),
  updateRefreshToken: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
    if (key === 'JWT_ACCESS_EXPIRATION_TIME') return '1h';
    if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
    if (key === 'JWT_REFRESH_EXPIRATION_TIME') return '7d';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: typeof mockUsersRepository;
  let jwtService: typeof mockJwtService;

  // 각 테스트 실행 전, 테스트 모듈 설정 및 Mock 주입
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(UsersRepository);
    jwtService = module.get(JwtService);
  });

  // 테스트 종료 후 Mock 상태 초기화
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    // 1. 정상 케이스: 아이디/비번 일치 시 유저 정보 반환
    it('유저가 존재하고 비밀번호가 일치하면 유저 정보를 반환해야 한다', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        nickname: 'tester',
        oauthAccounts: [
          {
            provider: 'local',
            passwordHash: await bcrypt.hash('password123', 10),
          },
        ],
      };

      mockUsersRepository.findByEmailWithAuth.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        nickname: 'tester',
      });
      expect(result).not.toHaveProperty('oauthAccounts');
    });

    // 2. 실패 케이스: 이메일 없음
    it('유저가 존재하지 않으면 null을 반환해야 한다', async () => {
      mockUsersRepository.findByEmailWithAuth.mockResolvedValue(null);
      const result = await service.validateUser('wrong@example.com', 'password');
      expect(result).toBeNull();
    });

    // 3. 실패 케이스: 비밀번호 불일치
    it('비밀번호가 일치하지 않으면 null을 반환해야 한다', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        oauthAccounts: [
          {
            provider: 'local',
            passwordHash: await bcrypt.hash('password123', 10),
          },
        ],
      };

      mockUsersRepository.findByEmailWithAuth.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@example.com', 'wrongPassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    // 로그인 성공 시 토큰 발급 및 DB 저장 로직 검증
    it('Access Token과 Refresh Token을 반환하고 Refresh Token을 DB에 저장해야 한다', async () => {
      const user = { id: 1, nickname: 'tester', email: 'test@example.com' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };

      mockJwtService.signAsync
        .mockResolvedValueOnce(tokens.accessToken) // 첫 번째 호출: Access Token
        .mockResolvedValueOnce(tokens.refreshToken); // 두 번째 호출: Refresh Token

      const result = await service.login(user);

      expect(result).toEqual(tokens);
      expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String), // 해싱된 토큰 문자열이 들어갔는지 확인
      );
    });
  });

  describe('rotateRefreshToken', () => {
    // 토큰 갱신 성공 케이스
    it('유효한 Refresh Token일 경우 토큰을 재발급해야 한다', async () => {
      const userId = 1;
      const oldRefreshToken = 'valid_refresh_token';
      const hashedRefreshToken = await bcrypt.hash(oldRefreshToken, 10);

      const mockUser = {
        id: userId,
        nickname: 'tester',
        email: 'test@example.com',
        currentRefreshToken: hashedRefreshToken,
      };

      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_token');

      const result = await service.rotateRefreshToken(userId, oldRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersRepository.updateRefreshToken).toHaveBeenCalled();
    });

    // 실패 케이스: 이미 로그아웃된 유저 (DB에 토큰 없음)
    it('DB에 저장된 토큰이 없으면(로그아웃 상태) UnauthorizedException을 던져야 한다', async () => {
      mockUsersRepository.findById.mockResolvedValue({ id: 1, currentRefreshToken: null });

      await expect(service.rotateRefreshToken(1, 'token')).rejects.toThrow(UnauthorizedException);
    });

    // 실패 케이스: 토큰 불일치 (해킹 시도 등)
    it('토큰이 일치하지 않으면 UnauthorizedException을 던져야 한다', async () => {
      const hashedRefreshToken = await bcrypt.hash('valid_token', 10);
      mockUsersRepository.findById.mockResolvedValue({
        id: 1,
        currentRefreshToken: hashedRefreshToken,
      });

      await expect(service.rotateRefreshToken(1, 'invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    // 로그아웃 시 DB 필드 초기화 검증
    it('DB의 Refresh Token을 null로 업데이트해야 한다', async () => {
      const userId = 1;
      await service.logout(userId);
      expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith(userId, null);
    });
  });
});
