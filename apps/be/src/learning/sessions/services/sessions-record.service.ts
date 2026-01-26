import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { NormalizeService } from '@/normalize/normalize.service';

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
  ) {}

  async record(
    sessionId: number,
    dto: RecordSessionAnswerDto,
    file: Express.Multer.File,
  ): Promise<{
    sttText: string;
    preSttText: string;
  }> {
    let objectKey: string | null = null;

    try {
      /**
       * 세션 존재 확인
       */
      const session = await this.sessionsRepository.findById(sessionId);

      if (!session) {
        this.logger.error('Session not found', { sessionId });

        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: '세션을 찾을 수 없습니다.',
        });
      }

      /**
       * 오디오 포맷 정규화
       * - speech 모듈에서 검증된 로직
       * - wav / mono / 16kHz 등 STT 요구사항 충족
       */
      const { buffer, contentType, filename } = await normalizeAudio(file);

      /**
       * Object Storage 업로드
       * - STT 서버가 직접 접근 가능한 위치
       */
      objectKey = await this.storageProvider.upload(buffer, contentType, filename);

      /**
       * STT 요청
       * - 파일을 다시 보내지 않음
       * - objectKey 기준으로 STT 서버가 fetch
       */
      const sttResult = await this.sttService.transcribe({
        objectKey,
        language: 'ko-KR',
        questionId: dto.questionId,
        extraQuestionId: dto.extraQuestionId,
      });

      /**
       * stt -> 정규화 로직
       */
      const normalizeResult = await this.normalizeService.normalizeForDraft(sttResult.text);
      /**
       * 응답 반환 -> 일단 최종 변환만 작성
       * 필요시 응답 변환
       * preNormalizedText: 음차만 변경
       * rawText: 기존 stt 텍스트
       */
      return {
        sttText: normalizeResult.draftText,
        preSttText: normalizeResult.preNormalizedText,
      };
    } catch (error) {
      this.logger.error('ERROR in record process', error);
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
