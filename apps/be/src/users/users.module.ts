import { Module } from '@nestjs/common';

import { XpRepository } from '@/learning/xp/repository/xp.repository';

import { UserCreditsRepository } from './credits/user-credits.repository';
import { UserStatsRepository } from './stats/repository/user-stats.repository';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UserCreditsRepository,
    UserStatsRepository,
    UsersService,
    UsersRepository,
    XpRepository,
  ],
  exports: [UserCreditsRepository, UserStatsRepository, UsersService, UsersRepository],
})
export class UsersModule {}
