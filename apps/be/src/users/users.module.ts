import { Module } from '@nestjs/common';

import { UserCreditsRepository } from './credits/user-credits.repository';

@Module({
  providers: [UserCreditsRepository],
  exports: [UserCreditsRepository],
})
export class UsersModule {}
