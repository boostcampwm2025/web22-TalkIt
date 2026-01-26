import { Module } from '@nestjs/common';

import { QuestionProviderModule } from '@/modules/question-provider/question-provider.module';
import { NormalizeModule } from '@/normalize/normalize.module';
import { StreakCalculatorService } from '@/users/stats/services/streak-calculator.service';
import { XpCalculatorService } from '@/users/stats/services/xp-calculator.service';
import { UsersModule } from '@/users/users.module';

import { DatabaseModule } from '../../infra/database/database.module';
import { ClovaSttProvider } from '../../stt/providers/clova-stt.provider';
import { SttModule } from '../../stt/stt.module';
import { XpRepository } from '../xp/repository/xp.repository';
import { SessionsRecordController } from './controllers/sessions-record.controller';
import { SessionsController } from './controllers/sessions.controller';
import { ObjectStorageProvider } from './providers/object-storage.provider';
import { SessionsRepository } from './repository/sessions.repository';
import { DeepDiveService } from './services/deep-dive.service';
import { GuideBuilderService } from './services/guide-builder.service';
import { SessionsRecordService } from './services/sessions-record.service';
import { SessionsService } from './services/sessions.service';

@Module({
  imports: [DatabaseModule, SttModule, QuestionProviderModule, UsersModule, NormalizeModule],
  controllers: [SessionsRecordController, SessionsController],
  providers: [
    SessionsRecordService,
    SessionsRepository,
    ObjectStorageProvider,
    ClovaSttProvider,
    SessionsService,
    GuideBuilderService,
    DeepDiveService,
    XpRepository,
    StreakCalculatorService,
    XpCalculatorService,
  ],
  exports: [DeepDiveService],
})
export class SessionsModule {}
