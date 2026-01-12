import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { ClovaSttProvider } from './providers/clova-stt.provider';

@Injectable()
export class SttService {
  constructor(private readonly clovaSttProvider: ClovaSttProvider) {}

  async transcribe(params: { objectKey: string; language: string }): Promise<{ text: string }> {
    try {
      const text = await this.clovaSttProvider.requestSTT(params.objectKey, params.language);

      return { text };
    } catch (error) {
      console.error('STT ERROR:', error);
      throw new InternalServerErrorException({
        code: 'STT_FAILED',
        message: '음성 인식 처리에 실패했습니다.',
      });
    }
  }
}
