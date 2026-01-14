import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { ClovaSttProvider } from '../providers/clova-stt.provider';
import { SttQuestionLoaderService } from './stt-question-loader.service';

@Injectable()
export class SttService {
  constructor(
    private readonly clovaSttProvider: ClovaSttProvider,
    private readonly questionLoader: SttQuestionLoaderService,
  ) {}

  // TODO: 여기 ObjectStorage에서 questionKey는 해당 질문 저장 위치!! 따라서 거기 있는지 확인!!
  //async transcribe(params: { objectKey: string; language: string, questionKey: string; }): Promise<{ text: string }> {
  async transcribe(params: { objectKey: string; language: string }): Promise<{ text: string }> {
    try {
      // TODO: ObjectStorage에 어떻게 질문이 올라가냐에 따라 key 파라미터로 넘겨주기
      // const questionMeta = await this.questionLoader.loadQuestionMeta(params.questionKey);
      const questionMeta = await this.questionLoader.loadQuestionMeta();
      const text = await this.clovaSttProvider.requestSTT(
        params.objectKey,
        params.language,
        questionMeta,
      );

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
