import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './modules/admin/admin.module';
import { QuestionFactoryModule } from './modules/question-factory/question-factory.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AdminModule, QuestionFactoryModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
