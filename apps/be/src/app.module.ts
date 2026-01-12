import { Module } from '@nestjs/common';

import { AdminModule } from './modules/admin/admin.module';
import { QuestionFactoryModule } from './modules/question-factory/question-factory.module';

@Module({
  imports: [AdminModule, QuestionFactoryModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
