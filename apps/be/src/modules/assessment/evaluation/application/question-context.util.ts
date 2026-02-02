export type QuestionContext = {
  id: number;
  content: string;
  mustInclude: string[];
  isExtra: boolean;
};

/**
 * 답변 레코드에서 질문 컨텍스트(문항 or 추가문항)를 추출하여 형식을 통일합니다.
 * - question 또는 extraQuestion 중 존재하는 쪽을 선택
 * - mustInclude는 배열 보장 및 문자열화
 */
export function extractQuestionContext(answer: any): QuestionContext {
  const isExtra = !!answer?.extraQuestion;
  const q = answer?.question ?? answer?.extraQuestion;
  if (!q) throw new Error('QUESTION_CONTEXT_NOT_FOUND');
  const mustInclude = Array.isArray(q.mustInclude) ? q.mustInclude.map(String) : [];
  return {
    id: q.id,
    content: String(q.content),
    mustInclude,
    isExtra,
  };
}
