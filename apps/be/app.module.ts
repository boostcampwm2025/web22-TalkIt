import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './src/infra/database/database.module';
import { SessionsModule } from './src/learning/sessions/sessions.module';
import { QuestionProviderModule } from './src/modules/question-provider/question-provider.module';
import { SttModule } from './src/stt/stt.module';

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
