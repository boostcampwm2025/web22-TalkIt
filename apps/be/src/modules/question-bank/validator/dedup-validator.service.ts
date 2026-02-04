import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '../../../infra/clova/clova.service';
import { calculateDifficulty } from '../common/difficulty-calculator';
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

export interface RemovedQuestion {
  index: number;
  content: string;
  reason: string;
}

@Injectable()
export class DedupValidatorService {
  private readonly logger = new Logger(DedupValidatorService.name);

  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly jaccardThreshold: number;

  constructor(private readonly clova: ClovaService) {
    this.temperature = parseFloat(process.env.QB_DEDUP_TEMPERATURE ?? '0.0');
    this.maxTokens = parseInt(process.env.QB_DEDUP_MAX_TOKENS ?? '1024', 10);
    this.jaccardThreshold = parseFloat(process.env.QB_DEDUP_JACCARD_THRESHOLD ?? '0.7');
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
  }> {
    const drafts = loadDraftFiles(category, chapter, folder);

    if (drafts.length === 0) {
      throw new Error(`No draft files found for ${category} chapter ${chapter}`);
    }

    this.logger.log(`Loaded ${drafts.length} draft questions for ${category} ch${chapter}`);

    const { filtered: jaccardFiltered, removedQuestions: jaccardRemoved } =
      this.filterByJaccard(drafts);

    this.logger.log(
      `Jaccard pre-filter: removed ${jaccardRemoved.length}, ${jaccardFiltered.length} remain`,
    );

    const llmRounds = parseInt(process.env.QB_DEDUP_LLM_ROUNDS ?? '3', 10);
    let current = jaccardFiltered;
    const allLlmRemoved: RemovedQuestion[] = [];

    for (let round = 1; round <= llmRounds; round++) {
      const result = await this.findDuplicates(current);

      allLlmRemoved.push(...result.removedQuestions);
      current = current.filter((_, i) => !result.removeIndices.has(i));
      this.logger.log(
        `LLM round ${round}/${llmRounds}: removed ${result.removeIndices.size}, ${current.length} remain`,
      );
    }

    const deduped = current;
    const removedQuestions = [...jaccardRemoved, ...allLlmRemoved];
    const removed = drafts.length - deduped.length;

    this.logger.log(`Total removed ${removed} duplicates, ${deduped.length} questions remain`);

    const finalQuestions = this.toFinalQuestions(deduped);
    const filePath = saveFinalQuestions(category, chapter, finalQuestions);

    this.logger.log(`Saved final questions to ${filePath}`);

    return { filePath, total: finalQuestions.length, removed, removedQuestions };
  }

  private async findDuplicates(questions: DraftQuestion[]): Promise<{
    removeIndices: Set<number>;
    removedQuestions: RemovedQuestion[];
  }> {
    const removeIndices = new Set<number>();
    const removedQuestions: RemovedQuestion[] = [];

    if (questions.length <= 1) return { removeIndices, removedQuestions };

    const systemPrompt = buildDedupSystemPrompt();
    const dedupInput = questions.map((q) => ({ content: q.content, keywords: q.keywords }));
    const userPrompt = buildDedupUserPrompt(dedupInput);

    try {
      const { content } = await this.clova.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          maxCompletionTokens: this.maxTokens,
          temperature: this.temperature,
          thinking: { effort: 'medium' },
        },
      );

      if (!content) {
        this.logger.warn('Empty dedup response, skipping dedup');
        return { removeIndices, removedQuestions };
      }

      const duplicates = this.parseDedupResponse(content);

      for (const dup of duplicates) {
        const removeIdx = dup.remove - 1;
        if (removeIdx < 0 || removeIdx >= questions.length) continue;

        removeIndices.add(removeIdx);
        removedQuestions.push({
          index: dup.remove,
          content: questions[removeIdx]!.content,
          reason: dup.reason,
        });
      }
    } catch (error) {
      this.logger.error('Dedup LLM call failed, proceeding without dedup', error);
    }

    return { removeIndices, removedQuestions };
  }

  private parseDedupResponse(content: string): DuplicateEntry[] {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]) as { duplicates?: unknown[] };
      if (Array.isArray(parsed.duplicates)) {
        return parsed.duplicates
          .filter(
            (d): d is { keep: number; remove: number; reason?: string } =>
              typeof d === 'object' &&
              d !== null &&
              typeof (d as Record<string, unknown>).keep === 'number' &&
              typeof (d as Record<string, unknown>).remove === 'number',
          )
          .map((d) => ({
            keep: d.keep,
            remove: d.remove,
            reason: typeof d.reason === 'string' ? d.reason : '',
          }));
      }
    } catch {
      this.logger.error('Failed to parse dedup response');
    }

    return [];
  }

  private filterByJaccard(questions: DraftQuestion[]): {
    filtered: DraftQuestion[];
    removedQuestions: RemovedQuestion[];
  } {
    const removedQuestions: RemovedQuestion[] = [];
    const removedIndices = new Set<number>();
    const tokenSets = questions.map((q) => this.tokenize(q.content));

    for (let i = 0; i < questions.length; i++) {
      if (removedIndices.has(i)) continue;
      for (let j = i + 1; j < questions.length; j++) {
        if (removedIndices.has(j)) continue;

        const similarity = this.jaccardSimilarity(tokenSets[i]!, tokenSets[j]!);
        if (similarity >= this.jaccardThreshold) {
          removedIndices.add(j);
          removedQuestions.push({
            index: j + 1,
            content: questions[j]!.content,
            reason: `[jaccard: ${similarity.toFixed(2)}] "${questions[i]!.content}"과(와) 유사`,
          });
          this.logger.log(
            `Jaccard duplicate: #${j + 1} → removed (similarity: ${similarity.toFixed(2)}, pair: #${i + 1})`,
          );
        }
      }
    }

    const filtered = questions.filter((_, i) => !removedIndices.has(i));
    return { filtered, removedQuestions };
  }

  private tokenize(text: string): Set<string> {
    const stripped = text.replace(
      /[은는이가을를의와과에서로으로도만까지부터마다처럼보다에게한테](?: |$)/g,
      ' ',
    );
    const tokens = stripped
      .replace(/[?.,!~()""'']/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return new Set(tokens);
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private toFinalQuestions(drafts: DraftQuestion[]): FinalQuestion[] {
    return drafts.map((draft) => ({
      ...draft,
      difficulty: calculateDifficulty(draft.conceptLevel, draft.depth),
      contentHash: crypto.createHash('sha256').update(draft.content).digest('hex'),
    }));
  }
}
