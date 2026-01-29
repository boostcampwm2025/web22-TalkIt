import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';

import { CreateUserDto } from '@repo/shared/schemas/auth';

import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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
}
