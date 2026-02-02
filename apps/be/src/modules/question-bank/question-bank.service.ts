import { Injectable, Logger } from '@nestjs/common';

import { Domain } from './data';
import { QuestionGeneratorService } from './generator/question-generator.service';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(private readonly generator: QuestionGeneratorService) {}

  async generateQuestions(category: Domain, chapter: number, count?: number) {
    this.logger.log(`[Pipeline] Step 2: Generating questions for ${category} chapter ${chapter}`);
    const result = await this.generator.generate({ category, chapter, count });
    this.logger.log(
      `[Pipeline] Generated ${result.total} questions in ${result.files.length} files`,
    );
    return result;
  }
}
