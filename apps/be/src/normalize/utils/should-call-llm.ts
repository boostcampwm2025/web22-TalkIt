// LLM 호출 여부 판단 유틸
// TODO : 상황에 따라 조금 더 정규화 필요
export function shouldCallLlm(text: string): boolean {
  if (!text) return false;

  // 너무 짧은 텍스트의 경우 LLM 호출 하더라도 변화 거의 없음
  if (text.length < 50) return false;

  return true;
}
