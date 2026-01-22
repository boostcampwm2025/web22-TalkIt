export const FOLLOWUP_QUESTION_GENERATOR = Symbol('FOLLOWUP_QUESTION_GENERATOR');

export interface FollowupQuestionGeneratorPort {
  generate(input: { question: string; answer: string }): Promise<{
    content: string;
    mustInclude: string[];
  }>;
}
