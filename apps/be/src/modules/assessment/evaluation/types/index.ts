// Centralized types for evaluation module

export type QuestionLike = {
  id: number;
  content: string;
  // Prisma JSON fields may be any/unknown; accept broadly
  mustInclude: unknown;
};

export type AnswerRelations = {
  question: QuestionLike | null;
  extraQuestion: QuestionLike | null;
};
