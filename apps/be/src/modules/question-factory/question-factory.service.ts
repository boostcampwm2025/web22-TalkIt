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
    const dedup = new Deduplicator();
    const accepted: Blueprint[] = [];
    let rejectedCount = 0;
    let duplicateCount = 0;
    let totalCandidates = 0;

    const expectedOverall =
      seed.allowedConceptLevels.length * seed.allowedQuestionDepths.length * req.nPerCell;
    this.logger.log(
      `qf_batch_start topic=${seed.topicId} expected_overall=${expectedOverall} n_per_cell=${req.nPerCell} chunk=${cfg.chunkSize}`,
    );

    // Optional seeding from existing JSONL to avoid cross-run duplicates
    if (cfg.seedExisting) {
      const existingPath = this.exporter.getOutPath(req.version, seed.domain, seed.topicId);
      try {
        if (require('fs').existsSync(existingPath)) {
          const raw = require('fs').readFileSync(existingPath, 'utf8');
          const lines = raw.split(/\r?\n/).filter(Boolean);
          for (const l of lines) {
            try {
              const bp = JSON.parse(l) as Blueprint;
              dedup.seed(bp);
            } catch {
              // ignore broken lines
            }
          }
          this.logger.log(
            `qf_seed_loaded topic=${seed.topicId} from=${existingPath} count=${lines.length}`,
          );
        }
      } catch (e) {
        this.logger.warn(
          `qf_seed_failed topic=${seed.topicId} reason=${(e as Error)?.message ?? e}`,
        );
      }
    }

    for (const level of seed.allowedConceptLevels) {
      for (const depth of seed.allowedQuestionDepths) {
        const target = req.nPerCell;
        const chunkSize = Math.max(1, Math.min(cfg.chunkSize, target));
        const maxCalls = Math.max(1, cfg.maxCallsPerCell);
        let produced = 0;
        let calls = 0;
        while (produced < target && calls < maxCalls) {
          const expectedChunk = Math.min(chunkSize, target - produced);
          const prompt = this.promptBuilder.buildCellPrompt(seed, level, depth, expectedChunk);
          this.logger.log(
            `qf_cell_request topic=${seed.topicId} level=${level} depth=${depth} expected_chunk=${expectedChunk} prompt_len=${prompt.length}`,
          );
          const raw = await this.llm.generateBlueprintBatch(prompt, seed, expectedChunk);
          let items: unknown[] = [];
          let rawLen: number | undefined;
          if (typeof raw === 'string') {
            rawLen = raw.length;
            try {
              items = extractJsonArray(raw);
            } catch (e) {
              this.logger.error(
                `qf_llm_parse_error topic=${seed.topicId} level=${level} depth=${depth} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
              );
              break; // break this cell on parse failure
            }
          } else if (Array.isArray(raw)) {
            items = raw as unknown[];
          } else if (
            raw &&
            typeof raw === 'object' &&
            'output' in (raw as Record<string, unknown>)
          ) {
            const out = (raw as Record<string, unknown>)['output'];
            if (typeof out === 'string') {
              rawLen = out.length;
              try {
                items = extractJsonArray(out);
              } catch (e) {
                this.logger.error(
                  `qf_llm_parse_error topic=${seed.topicId} level=${level} depth=${depth} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
                );
                break;
              }
            } else {
              items = Array.isArray(out) ? out : [];
            }
          }
          this.logger.log(
            `qf_cell_received topic=${seed.topicId} level=${level} depth=${depth} expected_chunk=${expectedChunk} received_count=${items.length} raw_len=${rawLen ?? 'n/a'}`,
          );
          totalCandidates += items.length;
          for (const item of items) {
            if (produced >= target) break;
            const parsed = parseBlueprint(item);
            if (!parsed) {
              rejectedCount++;
              continue;
            }
            if (
              parsed.concept_level !== level ||
              parsed.question_depth !== depth ||
              parsed.domain !== seed.domain ||
              parsed.topic_id !== seed.topicId
            ) {
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
            produced++;
          }
          calls++;
          if (calls >= maxCalls && produced < target) {
            this.logger.warn(
              `qf_cell_maxcalls topic=${seed.topicId} level=${level} depth=${depth} produced=${produced}/${target}`,
            );
          }
        }
        if (produced < target) {
          this.logger.warn(
            `qf_cell_incomplete topic=${seed.topicId} level=${level} depth=${depth} produced=${produced} target=${target}`,
          );
        }
      }
    }

    const outPath = this.exporter.writeJsonl(
      req.version,
      seed.domain,
      seed.topicId,
      accepted,
      cfg.exportMode,
    );
    this.logger.log(
      `qf_pipeline_stats topic=${seed.topicId} candidates=${totalCandidates} accepted=${accepted.length} rejected=${rejectedCount} duplicate=${duplicateCount} output=${outPath} mode=${cfg.exportMode}`,
    );
    return {
      acceptedCount: accepted.length,
      rejectedCount,
      duplicateCount,
      outputPath: outPath,
    };
  }
}
