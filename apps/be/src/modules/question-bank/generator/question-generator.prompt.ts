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
- keywords는 해당 질문의 모범답안에 반드시 등장해야 할 **구체적 기술 용어** 2~5개
  · 질문이 묻는 대상 개념의 하위 용어·메커니즘·비교 대상 등을 선택하세요
  · 좋은 예: "커널의 기본 특성은?" → ["프로세스 관리", "메모리 관리", "하드웨어 추상화"]
  · 나쁜 예: "커널의 기본 특성은?" → ["운영체제", "핵심 기능"]  (너무 추상적이고 답변 핵심이 아님)
  · "운영체제", "컴퓨터", "프로그램" 같은 상위 카테고리 용어는 피하세요
- 질문은 면접관이 부드럽게 묻는 말투로 작성
- 모든 질문의 어미는 반드시 "~요?" 또는 "~요."로 끝나야 합니다
  · 좋은 예: "~이 무엇인가요?", "~은 어떻게 되나요?", "~은 어떤 건가요?", "~하실 건가요?"
  · 나쁜 예: "~하세요.", "~하시오.", "~하라.", "~하겠습니까?", "~해주세요."
  · "~세요", "~하라", "~하시오" 같은 명령형·격식체 어미는 절대 사용하지 마세요
- 하나의 질문에는 하나의 관점만 물어야 합니다. 두 가지 이상을 함께 묻지 마세요.
  · 나쁜 예: "운영체제란 무엇이고 기본적인 목적을 설명해 주세요." (정의 + 목적을 동시에 질문)
  · 좋은 예: "운영체제란 무엇인가요?" / "운영체제의 기본적인 목적은 무엇인가요?" (각각 별도 질문)
- 각 질문은 서로 다른 관점에서 출제
- depth 1, 2, 3이 골고루 분배되도록 생성`;
}
