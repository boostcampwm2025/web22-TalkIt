import { ConceptLevel } from '../data';
import { DEPTH_CRITERIA } from '../data';

interface PromptInput {
  domain: string;
  chapter: number;
  chapterTitle: string;
  term: string;
  conceptLevel: ConceptLevel;
  count: number;
}

export function buildSystemPrompt(): string {
  return '당신은 CS 면접 질문을 생성하는 전문가입니다. 주어진 조건에 맞는 기술 면접 질문을 JSON 배열로 생성합니다.';
}

export function buildUserPrompt(input: PromptInput): string {
  const depthDescriptions = DEPTH_CRITERIA.map(
    (d) => `- depth ${d.depth} (${d.label}): ${d.description} 패턴: ${d.questionPattern}`,
  ).join('\n');

  return `다음 개념에 대해 3가지 깊이 수준의 면접 질문을 총 ${input.count}개 생성하세요.

- 도메인: ${input.domain}
- 챕터: ${input.chapter} - ${input.chapterTitle}
- 개념: ${input.term} (개념 난이도: ${input.conceptLevel})

[질문 깊이 기준]
${depthDescriptions}

각 depth가 골고루 포함되도록 생성하세요.

[출력 형식]
JSON 배열로만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요:
[
  {
    "term": "${input.term}",
    "depth": 1,
    "keywords": ["키워드1", "키워드2"],
    "content": "질문 내용"
  }
]

[제약]
- 질문은 한국어로 작성
- keywords는 답변에 반드시 포함되어야 할 핵심 용어 2~5개
- 질문은 면접관이 묻는 말투로 작성
- 각 질문은 서로 다른 관점에서 출제
- depth 1, 2, 3이 골고루 분배되도록 생성`;
}
