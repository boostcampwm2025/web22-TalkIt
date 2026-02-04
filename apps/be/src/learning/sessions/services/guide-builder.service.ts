import { Injectable } from '@nestjs/common';

@Injectable()
export class GuideBuilderService {
  /**
   * mustInclude 키워드로 답변 가이드 문장을 생성한다.
   * 키워드가 없으면 기본 안내 문구를 반환한다.
   */
  build(mustInclude: string[]): string {
    if (!mustInclude || mustInclude.length === 0) {
      return '핵심 개념을 중심으로 답변해보세요.';
    }

    return `${mustInclude.join(', ')}를(을) 중심으로 답변해보세요.`;
  }
}
