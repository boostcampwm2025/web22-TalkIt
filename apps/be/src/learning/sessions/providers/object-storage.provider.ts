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

  // 스토리지 파일 업로드는 어차피 음성파일을 저장하지 않으므로,
  // 클로바 스피치(장문인식)을 위한 역할로 임시 저장 -> STT 변환 후 삭제
  // key 저장 포맷은 temp/stt/{yyyy}/{mm}/{dd}/{uuid}-{filename}.wav
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

  // STT 파일 삭제
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
