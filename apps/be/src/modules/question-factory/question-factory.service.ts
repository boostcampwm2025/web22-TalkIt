import { Inject, Injectable, Logger } from '@nestjs/common';

import { CurriculumRepository } from './curriculum.repository';
import { Deduplicator } from './deduplicator';
import { Exporter } from './exporter';
import type { LlmClient } from './llm.client';
import { PromptBuilder } from './prompt.builder';
import { parseBlueprint } from './schemas';
import { Blueprint, GenerationRequest, GenerationResult, TopicSeed } from './types';
import { validateBlueprint } from './validator';

@Injectable()
export class QuestionFactoryService {
  private readonly logger = new Logger(QuestionFactoryService.name);
  constructor(
    private readonly curriculum: CurriculumRepository,
    private readonly promptBuilder: PromptBuilder,
    @Inject('LlmClient') private readonly llm: LlmClient,
    private readonly exporter: Exporter,
  ) {}

  buildSeed(domain: TopicSeed['domain'], topicId: string): TopicSeed {
    const topic = this.curriculum.getTopicById(domain, topicId);
    if (!topic) throw new Error('topic_not_found');
    return {
      domain,
      topicId: topic.id,
      allowedConceptLevels: topic.allowedConceptLevels,
      allowedQuestionDepths: topic.allowedQuestionDepths,
    };
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const seed = req.seed;
    const prompt = this.promptBuilder.buildBatchPrompt(seed, req.nPerCell);
    const rawItems = await this.llm.generateBlueprintBatch(prompt, seed, req.nPerCell);

    const dedup = new Deduplicator();
    const accepted: Blueprint[] = [];
    let rejectedCount = 0;
    let duplicateCount = 0;

    for (const item of rawItems) {
      const parsed = parseBlueprint(item);
      if (!parsed) {
        rejectedCount++;
        continue;
      }
      const vr = validateBlueprint(parsed);
      if (!vr.ok) {
        rejectedCount++;
        continue;
      }
      if (dedup.isDuplicate(parsed)) {
        duplicateCount++;
        continue;
      }
      accepted.push(parsed);
    }

    const outPath = this.exporter.writeJsonl(req.version, seed.domain, seed.topicId, accepted);
    return {
      acceptedCount: accepted.length,
      rejectedCount,
      duplicateCount,
      outputPath: outPath,
    };
  }
}
