import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '../../../infra/clova/clova.service';
import { calculateTotalDifficulty } from '../common/difficulty-calculator';
import { loadDraftFiles, saveFinalQuestions } from '../common/file-manager';
import { DraftQuestion, FinalQuestion } from '../common/question-bank.types';
import { Domain } from '../data';
import { buildDedupSystemPrompt, buildDedupUserPrompt } from './dedup-validator.prompt';
import * as crypto from 'crypto';

interface DuplicateEntry {
  keep: number;
  remove: number;
  reason: string;
}

@Injectable()
export class DedupValidatorService {
  private readonly logger = new Logger(DedupValidatorService.name);

  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(private readonly clova: ClovaService) {
    this.temperature = parseFloat(process.env.QB_DEDUP_TEMPERATURE ?? '0.0');
    this.maxTokens = parseInt(process.env.QB_DEDUP_MAX_TOKENS ?? '1024', 10);
  }

  async validateAndFinalize(
    category: Domain,
    chapter: number,
  ): Promise<{ filePath: string; total: number; removed: number }> {
    const drafts = loadDraftFiles(category, chapter);

    if (drafts.length === 0) {
      throw new Error(`No draft files found for ${category} chapter ${chapter}`);
    }

    this.logger.log(`Loaded ${drafts.length} draft questions for ${category} ch${chapter}`);

    const removeIndices = await this.findDuplicates(drafts);
    const deduped = drafts.filter((_, i) => !removeIndices.has(i));
    const removed = drafts.length - deduped.length;

    this.logger.log(`Removed ${removed} duplicates, ${deduped.length} questions remain`);

    const finalQuestions = this.toFinalQuestions(deduped);
    const filePath = saveFinalQuestions(category, chapter, finalQuestions);

    this.logger.log(`Saved final questions to ${filePath}`);

    return { filePath, total: finalQuestions.length, removed };
  }

  private async findDuplicates(questions: DraftQuestion[]): Promise<Set<number>> {
    const removeIndices = new Set<number>();

    if (questions.length <= 1) return removeIndices;

    const systemPrompt = buildDedupSystemPrompt();
    const userPrompt = buildDedupUserPrompt(questions);

    try {
      const { content } = await this.clova.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          maxCompletionTokens: this.maxTokens,
          temperature: this.temperature,
        },
      );

      if (!content) {
        this.logger.warn('Empty dedup response, skipping dedup');
        return removeIndices;
      }

      const duplicates = this.parseDedupResponse(content);

      for (const dup of duplicates) {
        const removeIdx = dup.remove - 1;
        if (removeIdx >= 0 && removeIdx < questions.length) {
          removeIndices.add(removeIdx);
          this.logger.log(`Duplicate found: #${dup.remove} → removed (reason: ${dup.reason})`);
        }
      }
    } catch (error) {
      this.logger.error('Dedup LLM call failed, proceeding without dedup', error);
    }

    return removeIndices;
  }

  private parseDedupResponse(content: string): DuplicateEntry[] {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.duplicates)) {
        return parsed.duplicates.filter(
          (d: any) => typeof d.keep === 'number' && typeof d.remove === 'number',
        );
      }
    } catch {
      this.logger.error('Failed to parse dedup response');
    }

    return [];
  }

  private toFinalQuestions(drafts: DraftQuestion[]): FinalQuestion[] {
    return drafts.map((draft) => ({
      ...draft,
      totalDifficulty: calculateTotalDifficulty(draft.difficulty, draft.depth),
      contentHash: crypto.createHash('sha256').update(draft.content).digest('hex'),
    }));
  }
}
