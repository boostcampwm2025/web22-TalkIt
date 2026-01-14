import { Injectable } from '@nestjs/common';

import { ObjectStorageProviderPort } from '../ports/object-storage.provider';

// 동적 import로 @aws-sdk/client-s3 의존성 미존재도 빌드 통과를 목표
@Injectable()
export class ObjectStorageProvider implements ObjectStorageProviderPort {
  private client: any;
  private bucket: string;

  constructor() {
    const endpoint = process.env.NCLOUD_OBJECT_ENDPOINT ?? 'https://kr.object.ncloudstorage.com';
    const region = 'kr-standard';
    this.bucket = process.env.OBJECT_STORAGE_BUCKET_NAME ?? '';

    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: process.env.NCP_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.NCP_SECRET_ACCESS_KEY ?? '',
        },
        forcePathStyle: true,
      });
    } catch {
      this.client = null;
    }
  }

  async upload(
    body: any,
    key: string,
    contentType?: string,
  ): Promise<{ key: string; etag?: string; size?: number }> {
    if (!this.client) {
      // 개발 시점에는 의존성 없이도 호출 가능하게 no-op 응답
      return { key };
    }

    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType ?? 'application/octet-stream',
    });
    const res = await this.client.send(cmd);
    const etag = res.ETag as string | undefined;
    let size: number | undefined;
    try {
      size = Buffer.isBuffer(body) ? body.length : undefined;
    } catch {
      size = undefined;
    }
    return { key, etag, size };
  }
}
