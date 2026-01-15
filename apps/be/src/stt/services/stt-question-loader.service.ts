import { Injectable } from '@nestjs/common';

import { QuestionMeta } from '../types/question-meta.type';

/**
 * Object Storage에 저장된 질문 메타데이터 로더
 *
 * 역할:
 * - questionId → QuestionMeta 로딩
 * - STT / Builder와 완전히 분리
 */
@Injectable()
export class SttQuestionLoaderService {
  /**
   * 지금은 MOCK
   * 나중에 Object Storage SDK로 교체
   */
  //TODO: questionKey 파라미터 통해 메타데이터 로딩
  //async loadQuestionMeta(questionKey: string): Promise<QuestionMeta> {
  async loadQuestionMeta(): Promise<QuestionMeta> {
    // TODO : 메타데이터 로딩
    // 예: questions/os.pt.process_vs_thread.json

    // 일단 현재는 MOCK 데이터
    return {
      prompt: '프로세스와 스레드의 메모리 공유 방식 차이를 설명하시오.',
      intent: '메모리 공유 방식의 차이점 이해',
      must_include: ['공유 메모리', '독립적 주소 공간', '상호 배제 문제'],
    };
  }
}
