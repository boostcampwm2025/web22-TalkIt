import { DraftQuestion } from '../common/question-bank.types';

export function buildDedupSystemPrompt(): string {
  return '당신은 CS 면접 질문의 중복 여부를 판단하는 전문가입니다. 의미적으로 동일한 질문 쌍을 찾아 JSON으로 반환합니다.';
}

export function buildDedupUserPrompt(questions: DraftQuestion[]): string {
  const numberedList = questions
    .map((q, i) => `${i + 1}. [${q.term} / depth ${q.depth}] ${q.content}`)
    .join('\n');

  return `아래 질문 목록에서 의미적으로 중복되는 질문 쌍을 찾으세요.
두 질문이 같은 내용을 다른 표현으로 묻고 있다면 중복입니다.
단, 같은 개념이라도 질문 깊이(depth)가 다르면 중복이 아닙니다.

[질문 목록]
${numberedList}

[출력 형식]
JSON만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "duplicates": [
    { "keep": 1, "remove": 3, "reason": "중복 사유" }
  ]
}
중복이 없으면 { "duplicates": [] }`;
}
