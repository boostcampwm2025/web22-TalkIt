import { Module } from '@nestjs/common';

import { QuestionProviderModule } from './modules/question-provider/question-provider.module';

@Module({
  imports: [QuestionProviderModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
