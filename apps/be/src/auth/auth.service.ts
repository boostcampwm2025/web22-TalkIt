import { Injectable } from '@nestjs/common';

import { type CreateUserDto } from '@/users/schemas/create-user.schema';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  // 회원가입 로직 (UsersService에게 일임)
  async register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
