import { Injectable, Logger } from '@nestjs/common';

import { Domain } from './data';
import { QuestionGeneratorService } from './generator/question-generator.service';
import {
  DedupValidatorService,
  RemovedQuestion,
  TokenUsage,
} from './validator/dedup-validator.service';

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(
    private readonly generator: QuestionGeneratorService,
    private readonly dedupValidator: DedupValidatorService,
  ) {}

  async generateQuestions(category: Domain, chapter: number, count?: number, terms?: string[]) {
    this.logger.log(`[Pipeline] Step 2: Generating questions for ${category} chapter ${chapter}`);
    const result = await this.generator.generate({ category, chapter, count, terms });
    this.logger.log(
      `[Pipeline] Generated ${result.total} questions in ${result.files.length} files`,
    );
    return result;
  }

  async validateAndFinalize(
    category: Domain,
    chapter: number,
    folder?: string,
  ): Promise<{
    filePath: string;
    total: number;
    removed: number;
    removedQuestions: RemovedQuestion[];
    tokenUsage: TokenUsage;
  }> {
    this.logger.log(`[Pipeline] Step 3: Validating and finalizing ${category} chapter ${chapter}`);
    const result = await this.dedupValidator.validateAndFinalize(category, chapter, folder);
    this.logger.log(
      `[Pipeline] Final: ${result.total} questions, ${result.removed} duplicates removed`,
    );
    return result;
  }

  async runFullPipeline(category: Domain, chapter: number, count?: number) {
    const genResult = await this.generateQuestions(category, chapter, count);
    const finalResult = await this.validateAndFinalize(category, chapter);
    return {
      generated: genResult.total,
      final: finalResult.total,
      removed: finalResult.removed,
      finalFile: finalResult.filePath,
    };
  }
}
