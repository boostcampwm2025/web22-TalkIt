import { Inject, Injectable, Logger } from '@nestjs/common';

import { loadQfConfig } from './config';
import { CurriculumRepository } from './curriculum.repository';
import { Deduplicator } from './deduplicator';
import { Exporter } from './exporter';
import type { LlmClient } from './llm.client';
import { PromptBuilder } from './prompt.builder';
import { parseBlueprint, parseTermBlueprint } from './schemas';
import {
  Blueprint,
  GenerationRequest,
  GenerationResult,
  TermGenerationRequest,
  TopicSeed,
} from './types';
import { extractJsonArray } from './utils/json-extractor';
import { validateBlueprint, validateTermBlueprint } from './validator';

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

    const effectiveLevels = cfg.forceConceptLevels ?? seed.allowedConceptLevels;
    const effectiveDepths = cfg.forceQuestionDepths ?? seed.allowedQuestionDepths;
    const expectedOverall = effectiveLevels.length * effectiveDepths.length * req.nPerCell;
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

    for (const level of effectiveLevels) {
      for (const depth of effectiveDepths) {
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

  // Term mode: generate blueprints for a single term with fixed concept level
  // Depth policy: Low only (documented)
  async generateByTerm(req: TermGenerationRequest): Promise<GenerationResult> {
    const cfg = loadQfConfig();
    const dedup = new Deduplicator();
    const accepted: any[] = [];
    let rejectedCount = 0;
    let duplicateCount = 0;
    let totalCandidates = 0;
    const rejectReasons: Record<string, number> = {};
    const bump = (k: string) => {
      rejectReasons[k] = (rejectReasons[k] ?? 0) + 1;
    };

    const level = req.conceptLevel;
    // Depth policy: Low only for term mode (keeps costs low and definitions focused)
    const depth: 'Low' = 'Low';
    const seed: TopicSeed = {
      domain: req.domain,
      topicId: req.term,
      allowedConceptLevels: [level],
      allowedQuestionDepths: [depth],
    };

    const requested = req.count;
    const overTarget = Math.max(requested, Math.ceil(requested * cfg.overgenFactor));
    const chunkSize = Math.max(1, Math.min(cfg.chunkSize, overTarget));
    const maxCalls = Math.max(1, cfg.maxCallsPerCell);
    let produced = 0;
    let calls = 0;
    let requestedSoFar = 0;
    this.logger.log(
      `qf_term_overgen_start term=${req.term} requested=${requested} over_target=${overTarget} chunk=${chunkSize}`,
    );
    while (produced < requested && calls < maxCalls && requestedSoFar < overTarget) {
      const expectedChunk = Math.min(chunkSize, overTarget - requestedSoFar);
      const prompt = this.promptBuilder.buildTermCellPrompt(
        req.domain,
        req.term,
        level,
        depth,
        expectedChunk,
      );
      this.logger.log(
        `qf_term_request term=${req.term} level=${level} depth=${depth} expected_chunk=${expectedChunk} requested_so_far=${requestedSoFar}/${overTarget} prompt_len=${prompt.length}`,
      );
      const raw = await this.llm.generateBlueprintBatch(prompt, seed, expectedChunk);
      requestedSoFar += expectedChunk;
      let items: unknown[] = [];
      let rawLen: number | undefined;
      if (typeof raw === 'string') {
        rawLen = raw.length;
        try {
          items = extractJsonArray(raw);
        } catch (e) {
          this.logger.error(
            `qf_llm_parse_error term=${req.term} level=${level} depth=${depth} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
          );
          break;
        }
      } else if (Array.isArray(raw)) {
        items = raw as unknown[];
      } else if (raw && typeof raw === 'object' && 'output' in (raw as Record<string, unknown>)) {
        const out = (raw as Record<string, unknown>)['output'];
        if (typeof out === 'string') {
          rawLen = out.length;
          try {
            items = extractJsonArray(out);
          } catch (e) {
            this.logger.error(
              `qf_llm_parse_error term=${req.term} level=${level} depth=${depth} raw_len=${rawLen} reason=${(e as Error)?.message ?? e}`,
            );
            break;
          }
        } else {
          items = Array.isArray(out) ? out : [];
        }
      }
      this.logger.log(
        `qf_term_received term=${req.term} level=${level} depth=${depth} expected_chunk=${expectedChunk} received_count=${items.length} raw_len=${rawLen ?? 'n/a'}`,
      );
      totalCandidates += items.length;
      for (const item of items) {
        if (produced >= requested) break;
        const parsed = parseTermBlueprint(item);
        if (!parsed) {
          rejectedCount++;
          bump('parse_fail');
          continue;
        }
        // Field matches with normalization for topic_id
        let mismatch = false;
        if (parsed.concept_level !== level) {
          bump('mismatch_concept_level');
          mismatch = true;
        }
        if (parsed.question_depth !== depth) {
          bump('mismatch_question_depth');
          mismatch = true;
        }
        if (parsed.domain !== req.domain) {
          bump('mismatch_domain');
          mismatch = true;
        }

        // Accept exact concept word or legacy 'term:<concept>' (case-insensitive, trim)
        const norm = (s: string) => (s || '').trim().toLowerCase();
        const pid = norm(parsed.topic_id);
        const wantWord = norm(req.term);
        const wantLegacy = norm(`term:${req.term}`);
        const topicOk = pid === wantWord || pid === wantLegacy;
        if (!topicOk) {
          bump('mismatch_topic_id');
          mismatch = true;
        }
        if (mismatch) {
          rejectedCount++;
          continue;
        }
        const vr = validateTermBlueprint(parsed);
        if (!vr.ok) {
          rejectedCount++;
          bump(`validator_${vr.reason ?? 'unknown'}`);
          continue;
        }
        if (dedup.isDuplicate(parsed)) {
          duplicateCount++;
          continue;
        }
        // common_mistakes는 term 모드 산출물에서 제외
        accepted.push({
          domain: parsed.domain,
          // Canonicalize topic_id in output to the concept word itself
          topic_id: req.term,
          concept_level: parsed.concept_level,
          question_depth: parsed.question_depth,
          prompt: parsed.prompt,
          intent: parsed.intent,
          must_include: parsed.must_include,
        });
        produced++;
      }
      calls++;
      if (calls >= maxCalls && produced < requested) {
        this.logger.warn(
          `qf_term_maxcalls term=${req.term} level=${level} depth=${depth} produced=${produced}/${requested} requested_so_far=${requestedSoFar}/${overTarget}`,
        );
      }
    }

    const outPath = this.exporter.getTermOutPath(
      req.version,
      req.domain,
      req.conceptLevel,
      req.term,
    );
    const path = this.exporter.writeJsonlToPath(outPath, accepted, cfg.exportMode);
    this.logger.log(
      `qf_term_pipeline term=${req.term} candidates=${totalCandidates} accepted=${accepted.length} rejected=${rejectedCount} duplicate=${duplicateCount} output=${path} mode=${cfg.exportMode} reasons=${JSON.stringify(
        rejectReasons,
      )}`,
    );
    return {
      acceptedCount: accepted.length,
      rejectedCount,
      duplicateCount,
      outputPath: path,
      outputPaths: [path],
    };
  }
}
