import { Module } from '@nestjs/common';

import { QuestionProviderModule } from '@/modules/question-provider/question-provider.module';
import { NormalizeModule } from '@/normalize/normalize.module';
import { UsersModule } from '@/users/users.module';

import { DatabaseModule } from '../../infra/database/database.module';
import { ClovaSttProvider } from '../../stt/providers/clova-stt.provider';
import { SttModule } from '../../stt/stt.module';
import { SessionsRecordController } from './controllers/sessions-record.controller';
import { SessionsController } from './controllers/sessions.controller';
import { ObjectStorageProvider } from './providers/object-storage.provider';
import { GuideBuilderService } from './services/guide-builder.service';
import { SessionsRecordService } from './services/sessions-record.service';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './sessions.repository';

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
  ],
})
export class SessionsModule {}
