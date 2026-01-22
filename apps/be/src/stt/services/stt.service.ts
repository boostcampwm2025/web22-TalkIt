import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import { SttBoostingBuilder } from '../builders/stt-boosting.builder';
import { ClovaSttProvider } from '../providers/clova-stt.provider';
import { SttQuestionLoaderService } from './stt-question-loader.service';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);

  constructor(
    private readonly clovaSttProvider: ClovaSttProvider,
    private readonly questionLoader: SttQuestionLoaderService,
  ) {}

  async transcribe(params: {
    objectKey: string;
    language: string;
    questionId?: number;
    extraQuestionId?: number;
  }): Promise<{ text: string }> {
    try {
      // 1. 메서드 진입
      this.logger.log('transcribe start', {
        objectKey: params.objectKey,
        language: params.language,
        questionId: params.questionId,
        extraQuestionId: params.extraQuestionId,
      });

      // 핵심 방어 로직
      if (
        (!params.questionId && !params.extraQuestionId) ||
        (params.questionId && params.extraQuestionId)
      ) {
        throw new Error('INVALID_QUESTION_TARGET');
      }

      // 2. QuestionMeta 로딩
      this.logger.log('loading question meta...');
      const questionMeta = await this.questionLoader.loadQuestionMeta({
        questionId: params.questionId,
        extraQuestionId: params.extraQuestionId,
      });

      // 3. boostWords 생성
      const boostWords = SttBoostingBuilder.build(questionMeta);
      this.logger.log('boostWords built', {
        boostWordsCount: boostWords.length,
      });

      // 4. QuestionMeta 로딩 완료
      this.logger.log('question meta loaded', {
        questionId: questionMeta.questionId,
        topicId: questionMeta.topicId,
        mustIncludeLength: questionMeta.mustInclude?.length,
      });

      // 5. Clova STT 호출
      this.logger.log('calling Clova STT', {
        objectKey: params.objectKey,
        language: params.language,
      });

      const text = await this.clovaSttProvider.requestSTT(
        params.objectKey,
        params.language,
        boostWords,
      );

      // 6. STT 성공
      this.logger.log('Clova STT success', {
        textLength: text?.length,
        textPreview: text?.slice(0, 50),
      });

      return { text };
    } catch (error) {
      // 7. 에러 처리
      this.logger.error('STT error occurred', error);

      if ((error as any)?.response) {
        this.logger.error('Clova response error', {
          status: (error as any).response.status,
          data: (error as any).response.data,
        });
      }

      throw new InternalServerErrorException({
        code: 'STT_FAILED',
        message: '음성 인식 처리에 실패했습니다.',
      });
    }
  }
}
