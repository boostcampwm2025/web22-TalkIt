import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class ObjectStorageProvider {
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

  // TODO : 스토리지 파일 업로드되는 디렉토리는 어떻게 관리할지 고민
  // 일단 test 디렉토리로 고정
  async upload(buffer: Buffer, contentType: string, filename = 'audio.wav'): Promise<string> {
    const key = `test/${Date.now()}-${filename}`;

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
}
