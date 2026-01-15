import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './infra/database/database.module';
import { SessionsModule } from './learning/sessions/sessions.module';
import { SttModule } from './stt/stt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SessionsModule,
    SttModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
