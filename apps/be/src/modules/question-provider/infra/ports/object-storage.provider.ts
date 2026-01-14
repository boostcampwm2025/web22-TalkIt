// NCloud Object Storage(S3 호환) 업로더 포트
export interface ObjectStorageProviderPort {
  upload(
    body: Buffer | Uint8Array | Blob | ReadableStream | any,
    key: string,
    contentType?: string,
  ): Promise<{ key: string; etag?: string; size?: number }>;
}

export const OBJECT_STORAGE_PROVIDER = Symbol('OBJECT_STORAGE_PROVIDER');
