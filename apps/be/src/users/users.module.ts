import { Module } from '@nestjs/common';

import { UserCreditsRepository } from './credits/user-credits.repository';
import { UserStatsRepository } from './stats/repository/user-stats.repository';

@Module({
  providers: [UserCreditsRepository, UserStatsRepository],
  exports: [UserCreditsRepository, UserStatsRepository],
})
export class UsersModule {}
