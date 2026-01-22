import { Injectable, NotFoundException } from '@nestjs/common';

import { NormalizeService } from '@/normalize/normalize.service';

import { normalizeAudio } from '../../../common/audio/normalize-audio';
import { SttService } from '../../../stt/services/stt.service';
import { ObjectStorageProvider } from '../providers/object-storage.provider';
import { SessionsRepository } from '../repository/sessions.repository';
import type { RecordSessionAnswerDto } from '../schemas/record-session-answer.schema';

@Injectable()
export class SessionsRecordService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly storageProvider: ObjectStorageProvider,
    private readonly sttService: SttService,
    private readonly normalizeService: NormalizeService,
  ) {}

  async record(
    sessionId: number,
    dto: RecordSessionAnswerDto,
    file: Express.Multer.File,
  ): Promise<{
    sttText: string;
  }> {
    let objectKey: string | null = null;

    try {
      console.log('[SessionsRecordService] 1. Starting record process');

      /**
       * 세션 존재 확인
       */
      console.log('[SessionsRecordService] 2. Checking session existence:', sessionId);
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        console.error('[SessionsRecordService] Session not found:', sessionId);
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: '세션을 찾을 수 없습니다.',
        });
      }
      console.log('[SessionsRecordService] Session found:', session);

      /**
       * 오디오 포맷 정규화
       * - speech 모듈에서 검증된 로직
       * - wav / mono / 16kHz 등 STT 요구사항 충족
       */
      console.log('[SessionsRecordService] 3. Normalizing audio');
      const { buffer, contentType, filename } = await normalizeAudio(file);
      console.log('[SessionsRecordService] Audio normalized:', {
        contentType,
        filename,
        bufferSize: buffer.length,
      });

      /**
       * Object Storage 업로드
       * - STT 서버가 직접 접근 가능한 위치
       */
      console.log('[SessionsRecordService] 4. Uploading to Object Storage');
      objectKey = await this.storageProvider.upload(buffer, contentType, filename);
      console.log('[SessionsRecordService] Uploaded to storage:', objectKey);

      /**
       * STT 요청
       * - 파일을 다시 보내지 않음
       * - objectKey 기준으로 STT 서버가 fetch
       */
      console.log('[SessionsRecordService] 5. Requesting STT');
      const sttResult = await this.sttService.transcribe({
        objectKey,
        language: 'ko-KR',
        questionId: Number(dto.questionId),
      });
      console.log('[SessionsRecordService] STT result:', sttResult);

      /**
       * stt -> 정규화 로직
       */
      console.log('[NormalizeService] Normalizing STT text for draft');
      const normalizeResult = await this.normalizeService.normalizeForDraft(sttResult.text);
      console.log(
        `[NormalizeService] Normalize completed | rawLength=${normalizeResult.rawText.length}, preLength=${normalizeResult.preNormalizedText.length}, draftLength=${normalizeResult.draftText.length}`,
      );

      /**
       * 응답 반환 -> 일단 최종 변환만 작성
       * 필요시 응답 변환
       * preNormalizedText: 음차만 변경
       * rawText: 기존 stt 텍스트
       */
      console.log('[SessionsRecordService] 7. Record process completed successfully');
      return {
        sttText: normalizeResult.draftText,
      };
    } catch (error) {
      console.error('[SessionsRecordService] ERROR in record process:', error);
      throw error;
    } finally {
      if (objectKey) {
        try {
          console.log('[SessionsRecordService] 6. Deleting temp object:', objectKey);
          await this.storageProvider.deleteObject(objectKey);
        } catch (cleanupError) {
          console.error(
            '[SessionsRecordService] Failed to delete temp object:',
            objectKey,
            cleanupError,
          );
        }
      }
    }
  }
}
