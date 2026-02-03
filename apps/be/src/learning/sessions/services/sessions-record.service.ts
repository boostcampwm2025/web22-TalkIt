import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { NormalizeService } from '@/normalize/normalize.service';
import { UserCreditsRepository } from '@/users/credits/user-credits.repository';

import { normalizeAudio } from '../../../common/audio/normalize-audio';
import { SttService } from '../../../stt/services/stt.service';
import { ObjectStorageProvider } from '../providers/object-storage.provider';
import { SessionsRepository } from '../repository/sessions.repository';
import type { RecordSessionAnswerDto } from '../schemas/record-session-answer.schema';

@Injectable()
export class SessionsRecordService {
  private readonly logger = new Logger(SessionsRecordService.name);

  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly storageProvider: ObjectStorageProvider,
    private readonly sttService: SttService,
    private readonly normalizeService: NormalizeService,
    private readonly userCreditsRepository: UserCreditsRepository,
  ) {}

  /**
   * 음성 파일을 업로드해 STT/정규화를 수행하고 텍스트를 반환한다.
   * 임시 업로드 후 STT를 호출하며, 처리 후 임시 파일은 삭제한다.
   */
  async record(
    sessionId: number,
    dto: RecordSessionAnswerDto,
    file: Express.Multer.File,
  ): Promise<{
    sttText: string;
  }> {
    let objectKey: string | null = null;

    try {
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        this.logger.error('Session not found', { sessionId });

        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: '세션을 찾을 수 없습니다.',
        });
      }

      const remainedCredit = await this.userCreditsRepository.getTotalCredit(session.userId);
      if (remainedCredit <= 0) {
        throw new ConflictException({
          code: 'INSUFFICIENT_CREDIT',
          message: '잔여 크레딧이 부족하여 녹음을 진행할 수 없습니다.',
        });
      }

      const { buffer, contentType, filename } = await normalizeAudio(file);

      objectKey = await this.storageProvider.upload(buffer, contentType, filename);

      const sttResult = await this.sttService.transcribe({
        objectKey,
        language: 'ko-KR',
        questionId: dto.questionId,
        extraQuestionId: dto.extraQuestionId,
      });

      const normalizeResult = await this.normalizeService.normalizeForDraft(sttResult.text);

      return {
        sttText: normalizeResult.draftText,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn('Domain error in record process', {
          sessionId,
          code: (error.getResponse() as any)?.code,
        });
        throw error;
      }

      this.logger.error('Unexpected error in record process', {
        sessionId,
        error: error instanceof Error ? error.stack : error,
      });

      throw error;
    } finally {
      if (objectKey) {
        try {
          await this.storageProvider.deleteObject(objectKey);
        } catch (cleanupError) {
          this.logger.error('Failed to delete temp object', {
            objectKey,
            error: cleanupError,
          });
        }
      }
    }
  }
}
