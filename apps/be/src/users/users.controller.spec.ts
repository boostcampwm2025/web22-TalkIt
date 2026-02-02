import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ActiveUser } from '@/common/decorators/active-user.decorator';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Mock UsersService 정의
const mockUsersService = {
  checkDuplicate: jest.fn(),
  getMyProfile: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkDuplicate', () => {
    it('유효한 type(email)이 주어지면 서비스의 checkDuplicate를 호출하고 결과를 반환해야 한다', async () => {
      const type = 'email';
      const value = 'test@example.com';

      // Service가 true(중복)를 반환한다고 가정
      mockUsersService.checkDuplicate.mockResolvedValue(true);

      const result = await controller.checkDuplicate(type, value);

      expect(usersService.checkDuplicate).toHaveBeenCalledWith(type, value);
      expect(result).toEqual({ isDuplicate: true });
    });

    it('유효한 type(nickname)이 주어지면 서비스의 checkDuplicate를 호출하고 결과를 반환해야 한다', async () => {
      const type = 'nickname';
      const value = 'tester';

      mockUsersService.checkDuplicate.mockResolvedValue(false);

      const result = await controller.checkDuplicate(type, value);

      expect(usersService.checkDuplicate).toHaveBeenCalledWith(type, value);
      expect(result).toEqual({ isDuplicate: false });
    });

    it('잘못된 type이 주어지면 BadRequestException을 던져야 한다', async () => {
      const type = 'invalid_type';
      const value = 'some_value';

      await expect(controller.checkDuplicate(type, value)).rejects.toThrow(BadRequestException);

      // 서비스는 호출되지 않아야 함
      expect(usersService.checkDuplicate).not.toHaveBeenCalled();
    });
  });

  describe('getMyProfile', () => {
    it('ActiveUser의 ID를 사용하여 프로필 정보를 반환해야 한다', async () => {
      const user: ActiveUser = {
        id: 1,
        nickname: 'tester',
        email: 'test@example.com',
      };

      // Service가 반환할 예상 데이터
      const mockProfileResponse = {
        profile: { nickname: 'tester', profileImage: null, bio: '' },
        progression: { level: 1, currentXp: 0, requiredXpForNextLevel: 100 },
        studyStats: { solvedProblemCount: 0, streak: 0, totalStudyTime: 0 },
        remainingCredit: 20,
      };

      mockUsersService.getMyProfile.mockResolvedValue(mockProfileResponse);

      const result = await controller.getMyProfile(user);

      expect(usersService.getMyProfile).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(mockProfileResponse);
    });
  });
});
