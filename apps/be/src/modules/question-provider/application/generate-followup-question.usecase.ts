import { Inject, Injectable } from '@nestjs/common';

import { FollowupQuestionGenerator } from '../infra/llm/followup-question-genrator';
import { FOLLOWUP_QUESTION_GENERATOR } from '../infra/ports/followup-question-generator.port';

@Injectable()
export class GenerateFollowupQuestionUseCase {
  constructor(
    @Inject(FOLLOWUP_QUESTION_GENERATOR)
    private readonly followupQuestionGenerator: FollowupQuestionGenerator,
  ) {}

  async execute(input: { answerContent: string }): Promise<{
    content: string;
    mustInclude: string[];
  }> {
    return this.followupQuestionGenerator.generate({
      answer: input.answerContent,
    });
  }
}
