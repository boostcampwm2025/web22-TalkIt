import { Inject, Injectable } from '@nestjs/common';

import { FollowupQuestionGenerator } from '../infra/llm/followup-question-genrator';
import { FOLLOWUP_QUESTION_GENERATOR } from '../infra/ports/followup-question-generator.port';

@Injectable()
export class GenerateFollowupQuestionUseCase {
  constructor(
    @Inject(FOLLOWUP_QUESTION_GENERATOR)
    private readonly followupQuestionGenerator: FollowupQuestionGenerator,
  ) {}

  // 꼬리질문 생성 로직 -> llm 호출

  async execute(input: { questionContent: string; answerContent: string }): Promise<{
    content: string;
    mustInclude: string[];
  }> {
    return this.followupQuestionGenerator.generate({
      question: input.questionContent,
      answer: input.answerContent,
    });
  }
}
