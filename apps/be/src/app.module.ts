import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './infra/database/database.module';
import { SessionsModule } from './learning/sessions/sessions.module';
import { SttModule } from './stt/stt.module';

import { QuestionProviderModule } from './modules/question-provider/question-provider.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SessionsModule,
    SttModule,
    QuestionProviderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
