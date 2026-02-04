export interface DedupInput {
  content: string;
  keywords: string[];
}

export function buildDedupSystemPrompt(): string {
  return `당신은 CS 면접 질문의 중복 여부를 판단하는 전문가입니다.

[판단 기준]
- 두 질문의 기대 답변 범위가 실질적으로 동일하면 중복입니다.
- 중복이라 판단되면 어떤 질문을 유지하고 어떤 질문을 제거할지 결정합니다.`;
}

export function buildDedupUserPrompt(questions: DedupInput[]): string {
  const numberedList = questions
    .map((q, i) => `${i + 1}. ${q.content} [${q.keywords.join(', ')}]`)
    .join('\n');

  return `아래 질문 목록에서 의미적으로 중복되는 질문 쌍을 찾으세요.
각 질문 뒤의 []는 핵심 키워드입니다. 키워드가 많이 겹치면 중복 가능성이 높습니다.

[판단 방법]
1. 두 질문에 대한 기대 답변을 각각 구체적으로 떠올립니다.
2. 두 답변의 핵심 내용이 거의 동일할 때만 중복입니다.
3. "관련이 있다"와 "중복이다"는 다릅니다. 같은 개념을 다루더라도 묻는 관점이 다르면 중복이 아닙니다.

[중복이 아닌 경우 - 반드시 지키세요]
- 같은 개념이라도 다른 관점(정의/목적/과정/비교/응용/평가)에서 묻는 질문은 중복이 아닙니다.
  예) "시스템 콜이란?" vs "시스템 콜의 내부 절차는?" → 중복 아님 (정의 vs 과정)
  예) "모드 전환 과정은?" vs "시스템 콜 실행 시 모드 전환은?" → 중복 아님 (일반 vs 특수 사례)
- 일반적 질문과 그 특수 사례/응용 질문은 중복이 아닙니다.
  예) "Dual Mode란?" vs "임베디드 시스템에서 Dual Mode 적용 가능성은?" → 중복 아님
- 하나가 다른 하나의 "부분집합"이라는 이유로 삭제하지 마세요. 더 깊거나 구체적인 질문은 별개입니다.
- 확신이 없으면 중복으로 판단하지 마세요. 보수적으로 판단합니다.

[질문 목록]
${numberedList}

[출력 형식]
JSON만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "duplicates": [
    { "keep": 1, "remove": 3, "reason": "중복 사유" }
  ]
}
- 중복이 없으면 { "duplicates": [] }`;
}
