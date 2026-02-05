import type { ExtraQuestion, Prisma, Question, Session, UserAnswer } from '@prisma/client';

// 답변 + 연관 엔터티 타입 (서비스/헬퍼 간 공유용)
export type AnswerWithRelations = UserAnswer & {
  session: Session;
  question: Question | null;
  extraQuestion: ExtraQuestion | null;
};

export class AssessmentSnapshotHelper {
  // 문자열 배열 변환 유틸: unknown → string[]
  private static toStringArray(v: unknown): string[] {
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  }

  // 질문 본문 추출: 일반/추가 질문 중 존재하는 쪽을 사용
  static extractQuestionContent(answer: AnswerWithRelations): string {
    return String(answer.question?.content ?? answer.extraQuestion?.content ?? '');
  }

  // feedbackJson 매핑 → strengths/weaknesses/suggestions
  static mapFeedbackJson(raw: Prisma.JsonValue | null): {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { strengths: [], weaknesses: [], suggestions: [] };
    }

    const obj = raw as Record<string, unknown>;

    const strengths = this.toStringArray(obj.accurate);
    const weaknesses = this.toStringArray(obj.weakness);
    const suggestions = this.toStringArray(obj.suggestions ?? obj.improvement);

    return { strengths, weaknesses, suggestions };
  }

  // 세션의 gainedXp(Json) → xp 합산값 계산
  static computeXp(raw: Prisma.JsonValue | null): number {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
    const obj = raw as Record<string, unknown>;
    const num = (n: unknown) => (typeof n === 'number' ? n : Number(n ?? 0));

    const base = num(obj.baseXp);
    const diff = num(obj.difficultyBonus);
    const deep = num(obj.deepDiveBonus);
    const sum = base + (isNaN(diff) ? 0 : diff) + (isNaN(deep) ? 0 : deep);
    return isNaN(sum) ? 0 : sum;
  }
}
