import type { AnswerRelations } from '../types';

/**
 * 답변 레코드에서 질문 컨텍스트(문항 or 추가문항)를 추출하여 형식을 통일합니다.
 * - question 또는 extraQuestion 중 존재하는 쪽을 선택
 * - mustInclude는 배열 보장 및 문자열화
 */
export function extractQuestionContext(answer: AnswerRelations): {
  id: number;
  content: string;
  mustInclude: string[];
} {
  const q = answer?.question ?? answer?.extraQuestion;
  if (!q) throw new Error('QUESTION_CONTEXT_NOT_FOUND');
  const mi = q.mustInclude;
  const mustInclude = Array.isArray(mi) ? mi.map((v) => String(v)) : [];
  return {
    id: q.id,
    content: q.content,
    mustInclude,
  };
}
