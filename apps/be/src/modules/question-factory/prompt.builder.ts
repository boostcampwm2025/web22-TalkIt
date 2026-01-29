import { Injectable } from '@nestjs/common';

import { ConceptLevel, Domain, QuestionDepth } from './types';

@Injectable()
export class PromptBuilder {
  buildSystemPrompt(): string {
    return `당신은 CS 면접 질문을 생성하는 전문가입니다.
반드시 유효한 JSON 배열만 출력하세요. 마크다운, 설명, 추가 텍스트는 금지입니다.`;
  }

  buildUserPrompt(
    domain: Domain,
    level: ConceptLevel,
    depth: QuestionDepth,
    count: number,
    term?: string,
  ): string {
    const target = term ? `용어: ${term}` : `도메인: ${domain}`;

    return `
다음 조건에 맞는 CS 면접 질문을 ${count}개 생성하세요.

조건:
- 도메인: ${domain}
- ${target}
- 난이도: ${level}
- 질문 깊이: ${depth}

출력 형식 (JSON 배열):
[
  {
    "domain": "${domain}",
    "topic_id": "질문 대상 개념",
    "concept_level": "${level}",
    "question_depth": "${depth}",
    "prompt": "한국어 질문 (20~120자, '요?'로 끝남)",
    "intent": "질문 의도 (한 문장)",
    "must_include": ["핵심 키워드1", "핵심 키워드2", "핵심 키워드3"]
  }
]

규칙:
- prompt: 한국어, 20~120자, 한 문장, "요?"로 끝남
- must_include: 3~5개, 중복 없음
- 질문 간 중복 없이 다양하게 생성
`.trim();
  }
}
