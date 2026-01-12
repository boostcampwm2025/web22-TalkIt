import { Inject, Injectable, Logger } from '@nestjs/common';

import { loadQfConfig } from './config';
import { CurriculumRepository } from './curriculum.repository';
import { Deduplicator } from './deduplicator';
import { Exporter } from './exporter';
import type { LlmClient } from './llm.client';
import { PromptBuilder } from './prompt.builder';
import { parseBlueprint } from './schemas';
import { Blueprint, GenerationRequest, GenerationResult, TopicSeed } from './types';
import { extractJsonArray } from './utils/json-extractor';
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
    const cfg = loadQfConfig();
    const effectiveN = Math.max(1, Math.ceil(req.nPerCell * cfg.overgenFactor));
    const prompt = this.promptBuilder.buildBatchPrompt(seed, effectiveN);
    const expected =
      seed.allowedConceptLevels.length * seed.allowedQuestionDepths.length * effectiveN;
    this.logger.log(
      `qf_llm_request topic=${seed.topicId} expected_count=${expected} prompt_len=${prompt.length} n_per_cell=${effectiveN}`,
    );
    const raw = await this.llm.generateBlueprintBatch(prompt, seed, effectiveN);
    let candidates: unknown[] = [];
    let rawLen: number | undefined;
    if (typeof raw === 'string') {
      rawLen = raw.length;
      try {
        candidates = extractJsonArray(raw);
      } catch (e) {
        this.logger.error(
          `qf_llm_parse_error topic=${seed.topicId} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
        );
        throw e;
      }
    } else if (Array.isArray(raw)) {
      candidates = raw as unknown[];
    } else if (raw && typeof raw === 'object' && 'output' in (raw as Record<string, unknown>)) {
      const out = (raw as Record<string, unknown>)['output'];
      if (typeof out === 'string') {
        rawLen = out.length;
        try {
          candidates = extractJsonArray(out);
        } catch (e) {
          this.logger.error(
            `qf_llm_parse_error topic=${seed.topicId} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
          );
          throw e;
        }
      } else {
        candidates = Array.isArray(out) ? out : [];
      }
    }
    this.logger.log(
      `qf_llm_received topic=${seed.topicId} expected_count=${expected} received_count=${candidates.length} raw_len=${
        rawLen ?? 'n/a'
      }`,
    );

    const dedup = new Deduplicator();
    const accepted: Blueprint[] = [];
    let rejectedCount = 0;
    let duplicateCount = 0;

    for (const item of candidates) {
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
    this.logger.log(
      `qf_pipeline_stats topic=${seed.topicId} candidates=${candidates.length} accepted=${accepted.length} rejected=${rejectedCount} duplicate=${duplicateCount} output=${outPath}`,
    );
    return {
      acceptedCount: accepted.length,
      rejectedCount,
      duplicateCount,
      outputPath: outPath,
    };
  }
}
