import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { SttBoostingBuilder } from '../builders/stt-boosting.builder';
import { ClovaSttProvider } from '../providers/clova-stt.provider';
import { SttQuestionLoaderService } from './stt-question-loader.service';

@Injectable()
export class SttService {
  constructor(
    private readonly clovaSttProvider: ClovaSttProvider,
    private readonly questionLoader: SttQuestionLoaderService,
  ) {}

  async transcribe(params: {
    objectKey: string;
    language: string;
    questionId: number;
  }): Promise<{ text: string }> {
    try {
      // 1. 메서드 진입
      console.log('[STT] transcribe start', {
        objectKey: params.objectKey,
        language: params.language,
        questionId: params.questionId,
        questionIdType: typeof params.questionId,
      });

      // 2. QuestionMeta 로딩 시작
      console.log('[STT] loading question meta...');
      const questionMeta = await this.questionLoader.loadQuestionMeta(params.questionId);

      // 3. QuestionMeta 로딩 완료
      console.log('[STT] question meta loaded', {
        questionId: questionMeta.questionId,
        topicId: questionMeta.topicId,
        mustInclude: questionMeta.mustInclude,
        mustIncludeLength: questionMeta.mustInclude?.length,
      });

      // 4. boostWords 생성
      const boostWords = SttBoostingBuilder.build(questionMeta);
      console.log('[STT] boostWords built', {
        boostWords,
        boostWordsCount: boostWords.length,
      });

      // 5. Clova STT 호출 직전
      console.log('[STT] calling Clova STT', {
        objectKey: params.objectKey,
        language: params.language,
      });

      const text = await this.clovaSttProvider.requestSTT(
        params.objectKey,
        params.language,
        boostWords,
      );

      // 6. Clova STT 응답 수신
      console.log('[STT] Clova STT success', {
        textLength: text?.length,
        textPreview: text?.slice(0, 50),
      });

      return { text };
    } catch (error) {
      // 7. 에러 발생 지점 로그
      console.error('[STT ERROR] occurred');
      console.error('[STT ERROR] raw error:', error);

      // axios 에러일 경우 (Clova)
      if ((error as any)?.response) {
        console.error('[STT ERROR] Clova response status:', (error as any).response.status);
        console.error('[STT ERROR] Clova response data:', (error as any).response.data);
      }

      throw new InternalServerErrorException({
        code: 'STT_FAILED',
        message: '음성 인식 처리에 실패했습니다.',
      });
    }
  }
}
