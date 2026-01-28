// LLM 호출 여부 판단 유틸
// TODO : 상황에 따라 조금 더 정규화 필요
export function shouldCallLlm(text: string): boolean {
  if (!text) return false;

  const trimmed = text.trim();
  if (!trimmed) return false;

  if (trimmed.length < 30) return false;

  return true;
}
