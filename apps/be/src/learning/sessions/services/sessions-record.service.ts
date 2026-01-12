import { Injectable, NotFoundException } from '@nestjs/common';

import { normalizeAudio } from '../../../common/audio/normalize-audio';
import { SttService } from '../../../stt/stt.service';
import { RecordSessionAnswerDto } from '../dto/record-session-answer.dto';
import { ObjectStorageProvider } from '../providers/object-storage.provider';
import { SessionsRepository } from '../sessions.repository';

@Injectable()
export class SessionsRecordService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly storageProvider: ObjectStorageProvider,
    private readonly sttService: SttService,
  ) {}

  async record(
    sessionId: number,
    dto: RecordSessionAnswerDto,
    file: Express.Multer.File,
  ): Promise<{
    answerId: string;
    sttText: string;
  }> {
    try {
      console.log('[SessionsRecordService] 1. Starting record process');

      /**
       * 타입 변환: number → bigint (데이터베이스 타입)
       */
      const sessionIdBigInt = BigInt(sessionId);

      /**
       * 세션 존재 확인
       */
      console.log('[SessionsRecordService] 2. Checking session existence:', sessionId);
      const session = await this.sessionsRepository.findById(sessionIdBigInt);

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
      const objectKey = await this.storageProvider.upload(buffer, contentType, filename);
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
      });
      console.log('[SessionsRecordService] STT result:', sttResult);

      /**
       * 답변 저장
       * - STT 결과 중 text만 저장
       * - 타입 변환: string → bigint (questionId)
       */
      console.log('[SessionsRecordService] 6. Saving answer to database');
      const answer = await this.sessionsRepository.saveAnswer({
        sessionId: sessionIdBigInt,
        userId: session.userId, // 세션에서 userId 가져오기 (이미 bigint)
        questionId: BigInt(dto.questionId), // string → bigint 변환
        answerText: sttResult.text,
        timeSpentSec: 0, // TODO: 실제 소요 시간 계산
      });
      console.log('[SessionsRecordService] Answer saved:', answer);

      /**
       * 응답 반환
       */
      console.log('[SessionsRecordService] 7. Record process completed successfully');
      return {
        answerId: answer.id.toString(),
        sttText: sttResult.text,
      };
    } catch (error) {
      console.error('[SessionsRecordService] ERROR in record process:', error);
      throw error;
    }
  }
}
