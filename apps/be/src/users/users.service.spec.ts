import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { XpRepository } from '@/learning/xp/repository/xp.repository';

import { UserCreditsRepository } from './credits/user-credits.repository';
import { UserStatsRepository } from './stats/repository/user-stats.repository';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

// Mocking Dependencies
const mockUsersRepository = {
  findByEmail: jest.fn(),
  findByNickname: jest.fn(),
  createUserWithAuth: jest.fn(),
  findById: jest.fn(),
};

const mockUserStatsRepository = {
  findStatsByUserId: jest.fn(),
};

const mockXpRepository = {
  findRequiredXpByLevel: jest.fn(),
};

const mockUserCreditsRepository = {
  getTotalCredit: jest.fn(),
};

// Bcrypt Mocking
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: typeof mockUsersRepository;
  let userStatsRepository: typeof mockUserStatsRepository;
  let xpRepository: typeof mockXpRepository;
  let userCreditsRepository: typeof mockUserCreditsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: UserStatsRepository, useValue: mockUserStatsRepository },
        { provide: XpRepository, useValue: mockXpRepository },
        { provide: UserCreditsRepository, useValue: mockUserCreditsRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
    userStatsRepository = module.get(UserStatsRepository);
    xpRepository = module.get(XpRepository);
    userCreditsRepository = module.get(UserCreditsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDuplicate', () => {
    it('이메일 중복 검사: 중복된 이메일이 있으면 true를 반환해야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({ id: 1, email: 'exist@example.com' });
      const result = await service.checkDuplicate('email', 'exist@example.com');
      expect(result).toBe(true);
      expect(usersRepository.findByEmail).toHaveBeenCalledWith('exist@example.com');
    });

    it('이메일 중복 검사: 중복된 이메일이 없으면 false를 반환해야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      const result = await service.checkDuplicate('email', 'new@example.com');
      expect(result).toBe(false);
    });

    it('닉네임 중복 검사: 중복된 닉네임이 있으면 true를 반환해야 한다', async () => {
      mockUsersRepository.findByNickname.mockResolvedValue({ id: 1, nickname: 'existUser' });
      const result = await service.checkDuplicate('nickname', 'existUser');
      expect(result).toBe(true);
      expect(usersRepository.findByNickname).toHaveBeenCalledWith('existUser');
    });

    it('닉네임 중복 검사: 중복된 닉네임이 없으면 false를 반환해야 한다', async () => {
      mockUsersRepository.findByNickname.mockResolvedValue(null);
      const result = await service.checkDuplicate('nickname', 'newUser');
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      nickname: 'newUser',
      password: 'password123',
    };

    it('이메일이 중복되면 ConflictException을 던져야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({ id: 1 }); // 이메일 존재
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('닉네임이 중복되면 ConflictException을 던져야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.findByNickname.mockResolvedValue({ id: 1 }); // 닉네임 존재
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('중복이 없으면 비밀번호를 해싱하고 유저를 생성해야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.findByNickname.mockResolvedValue(null);

      const createdUser = {
        id: 1,
        email: createUserDto.email,
        nickname: createUserDto.nickname,
        createdAt: new Date(),
      };
      mockUsersRepository.createUserWithAuth.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      // bcrypt.hash 호출 확인
      expect(bcrypt.hash).toHaveBeenCalled();

      // Repository 호출 확인
      expect(usersRepository.createUserWithAuth).toHaveBeenCalledWith(
        { email: createUserDto.email, nickname: createUserDto.nickname },
        expect.objectContaining({
          provider: 'local',
          providerUserId: createUserDto.email,
          passwordHash: 'hashed_password',
        }),
      );

      expect(result).toEqual(createdUser);
    });

    it('DB 생성 중 에러 발생 시 InternalServerErrorException을 던져야 한다', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.findByNickname.mockResolvedValue(null);
      mockUsersRepository.createUserWithAuth.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(createUserDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getMyProfile', () => {
    const userId = 1;

    it('존재하지 않는 유저일 경우 NotFoundException을 던져야 한다', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);
      await expect(service.getMyProfile(userId)).rejects.toThrow(NotFoundException);
    });

    it('유저 정보와 통계, 크레딧 정보를 종합하여 반환해야 한다', async () => {
      // 1. Mock Data Setup
      const mockUser = {
        id: userId,
        nickname: 'tester',
        profileImageUrl: 'http://img.url',
        bio: 'Hello',
      };

      const mockStats = {
        level: 5,
        currentXp: 500,
        totalSolvedQuestions: 10,
        streakDays: 3,
        totalStudyTimeSec: 1200,
      };

      const requiredXp = 1000;
      const credit = 50;

      // 2. Mock Implementation
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUserStatsRepository.findStatsByUserId.mockResolvedValue(mockStats);
      mockXpRepository.findRequiredXpByLevel.mockResolvedValue(requiredXp);
      mockUserCreditsRepository.getTotalCredit.mockResolvedValue(credit);

      // 3. Execution
      const result = await service.getMyProfile(userId);

      // 4. Verification
      expect(usersRepository.findById).toHaveBeenCalledWith(userId);
      expect(userStatsRepository.findStatsByUserId).toHaveBeenCalledWith(userId);
      // 다음 레벨(currentLevel + 1)의 XP를 조회하는지 확인
      expect(xpRepository.findRequiredXpByLevel).toHaveBeenCalledWith(mockStats.level + 1);
      expect(userCreditsRepository.getTotalCredit).toHaveBeenCalledWith(userId);

      // 5. Result Structure Check
      expect(result).toEqual({
        profile: {
          nickname: mockUser.nickname,
          profileImage: mockUser.profileImageUrl,
          bio: mockUser.bio,
        },
        progression: {
          level: mockStats.level,
          currentXp: mockStats.currentXp,
          requiredXpForNextLevel: requiredXp,
          lp: 0,
        },
        studyStats: {
          solvedProblemCount: mockStats.totalSolvedQuestions,
          streak: mockStats.streakDays,
          totalStudyTime: mockStats.totalStudyTimeSec,
        },
        social: {
          followerCount: 0,
          followCount: 0,
        },
        remainingCredit: credit,
      });
    });

    it('통계 정보가 없을 경우 기본값(0, level 1)으로 반환해야 한다', async () => {
      mockUsersRepository.findById.mockResolvedValue({ id: userId, nickname: 'tester' });
      mockUserStatsRepository.findStatsByUserId.mockResolvedValue(null); // 통계 없음
      mockXpRepository.findRequiredXpByLevel.mockResolvedValue(100);
      mockUserCreditsRepository.getTotalCredit.mockResolvedValue(0);

      const result = await service.getMyProfile(userId);

      expect(result.progression.level).toBe(1); // Default Level
      expect(result.progression.currentXp).toBe(0); // Default XP
      expect(result.studyStats.solvedProblemCount).toBe(0); // Default Count
    });
  });
});
