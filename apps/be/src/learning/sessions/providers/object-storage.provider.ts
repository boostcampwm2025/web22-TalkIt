import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { randomUUID } from 'crypto';

@Injectable()
export class ObjectStorageProvider {
  private readonly logger = new Logger(ObjectStorageProvider.name);
  private client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('OBJECT_STORAGE_BUCKET_NAME');

    this.client = new S3Client({
      region: 'kr-standard',
      endpoint: 'https://kr.object.ncloudstorage.com',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('NCP_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('NCP_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * 음성 파일을 임시 경로로 업로드하고 저장 키를 반환한다.
   * 날짜/UUID 기반 경로를 생성해 충돌을 방지한다.
   */
  async upload(buffer: Buffer, contentType: string, filename = 'audio.wav'): Promise<string> {
    const now = new Date();
    const key = [
      'temp',
      'stt',
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      `${randomUUID()}-${filename}`,
    ].join('/');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return key;
  }

  /**
   * STT 처리가 끝난 임시 파일을 스토리지에서 삭제한다.
   * 삭제 실패는 경고 로그만 남기고 흐름을 유지한다.
   */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `object 스토리지 파일 삭제 실패: ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
