import { Test, TestingModule } from '@nestjs/testing';

import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { CreateUserDto, LoginDto } from '@repo/shared/schemas/auth';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response } from 'express';

// Mock AuthService 정의
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  rotateRefreshToken: jest.fn(),
  logout: jest.fn(),
};

// Mock Response 객체 정의 (Express Response)
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('회원가입 성공 시, 비밀번호를 제외한 유저 정보를 반환해야 한다', async () => {
      // Input DTO
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        nickname: 'tester',
        password: 'Password123!',
      };

      // Service가 반환할 Mock User 객체
      const createdUser = {
        id: 1,
        email: 'test@example.com',
        nickname: 'tester',
        profileImageUrl: 'http://image.url',
        createdAt: new Date(),
        // 실제로는 passwordHash 등이 포함될 수 있으나, 컨트롤러가 이를 걸러내는지 확인
      };

      mockAuthService.register.mockResolvedValue(createdUser);

      const result = await controller.register(createUserDto);

      // Service 호출 검증
      expect(authService.register).toHaveBeenCalledWith(createUserDto);

      // 반환값 구조 검증 (id, email, nickname 등 포함 여부)
      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        nickname: createdUser.nickname,
        profileImageUrl: createdUser.profileImageUrl,
        createdAt: createdUser.createdAt,
      });
    });
  });

  describe('login', () => {
    it('로그인 성공 시 AccessToken을 반환하고 RefreshToken을 쿠키에 설정해야 한다', async () => {
      // Mock Request User (LocalStrategy 통과 후 req.user)
      const req = {
        user: { id: 1, email: 'test@example.com', nickname: 'tester' },
      };

      const loginDto: LoginDto = { email: 'test@example.com', password: 'password' };
      const res = mockResponse() as Response;

      // Service 반환값 Mock
      const tokens = {
        accessToken: 'access_token_jwt',
        refreshToken: 'refresh_token_jwt',
      };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(req, loginDto, res);

      // 1. Service의 login 메서드가 req.user와 함께 호출되었는지 확인
      expect(authService.login).toHaveBeenCalledWith(req.user);

      // 2. 응답 헤더(Cookie)에 refreshToken이 설정되었는지 확인
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        tokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: expect.any(Number),
        }),
      );

      // 3. 반환값에 AccessToken이 포함되어 있는지 확인
      expect(result).toEqual({ accessToken: tokens.accessToken });
    });
  });

  describe('refresh', () => {
    it('토큰 재발급 성공 시, 새 AccessToken 반환 및 쿠키 갱신을 수행해야 한다', async () => {
      const userWithRefreshToken = {
        id: 1,
        nickname: 'tester',
        email: 'test@example.com',
        refreshToken: 'old_refresh_token',
      } as ActiveUser & { refreshToken: string };

      const res = mockResponse() as Response;

      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      mockAuthService.rotateRefreshToken.mockResolvedValue(newTokens);

      // 컨트롤러 메서드 호출
      const result = await controller.refresh(userWithRefreshToken, res);

      // 검증
      expect(authService.rotateRefreshToken).toHaveBeenCalledWith(
        userWithRefreshToken.id,
        userWithRefreshToken.refreshToken,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newTokens.refreshToken,
        expect.anything(),
      );
      expect(result).toEqual({ accessToken: newTokens.accessToken });
    });
  });

  describe('logout', () => {
    it('로그아웃 시 DB 토큰 삭제 및 클라이언트 쿠키 삭제를 수행해야 한다', async () => {
      const activeUser: ActiveUser = {
        id: 1,
        nickname: 'tester',
        email: 'test@example.com',
      };

      const res = mockResponse() as Response;

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(activeUser, res);

      expect(authService.logout).toHaveBeenCalledWith(activeUser.id);
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          path: '/',
          httpOnly: true,
        }),
      );
    });
  });
});
