import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './src/auth/auth.module';
import { DatabaseModule } from './src/infra/database/database.module';
import { SessionsModule } from './src/learning/sessions/sessions.module';
import { AssessmentModule } from './src/modules/assessment/assessment.module';
import { QuestionFactoryModule } from './src/modules/question-factory/question-factory.module';
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
    AssessmentModule,
    AuthModule,
    QuestionFactoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
