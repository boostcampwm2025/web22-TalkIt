import { QuestionMeta } from '../types/question-meta.type';

export class SttBoostingBuilder {
  /**
   * STT 키워드 부스팅 빌더
   *
   * 역할:
   * - QuestionMeta.must_include 를 기반으로
   * - CLOVA STT boostWords(string[]) 생성
   *
   * 주의:
   * - 말하지 않은 단어를 강제로 만들지 않음
   * - 빌더(domain)에서 이미 잘 인식하는 단어는 최소화
   */
  static build(question: QuestionMeta): string[] {
    const keywords: string[] = [];

    question.mustInclude.forEach((phrase) => {
      keywords.push(...this.expandPhrase(phrase));
    });

    return [...new Set(keywords)];
  }

  /**
   * 복합 개념어 분해
   *
   * 예:
   * "독립적 주소 공간"
   * → ["독립적 주소 공간", "주소 공간"]
   */

  private static expandPhrase(phrase: string): string[] {
    const results: string[] = [phrase];

    const parts = phrase.split(' ');
    if (parts.length >= 2) {
      // 핵심 개념만 보조로 추가
      results.push(parts.slice(1).join(' '));
    }

    return results;
  }
}
