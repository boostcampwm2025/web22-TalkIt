import { Injectable } from '@nestjs/common';

@Injectable()
export class GuideBuilderService {
  build(mustInclude: string[]): string {
    if (!mustInclude || mustInclude.length === 0) {
      return '핵심 개념을 중심으로 답변해보세요.';
    }

    return `${mustInclude.join(', ')}를(을) 중심으로 답변해보세요.`;
  }
}
