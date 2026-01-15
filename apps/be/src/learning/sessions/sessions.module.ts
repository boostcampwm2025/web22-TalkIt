import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infra/database/database.module';
import { ClovaSttProvider } from '../../stt/providers/clova-stt.provider';
import { SttModule } from '../../stt/stt.module';
import { SessionsRecordController } from './controllers/sessions-record.controller';
import { ObjectStorageProvider } from './providers/object-storage.provider';
import { SessionsRecordService } from './services/sessions-record.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [DatabaseModule, SttModule],
  controllers: [SessionsRecordController],
  providers: [SessionsRecordService, SessionsRepository, ObjectStorageProvider, ClovaSttProvider],
})
export class SessionsModule {}
