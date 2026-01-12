import { Injectable } from '@nestjs/common';

import { CurriculumRepository } from './curriculum.repository';
import { ConceptLevel, QuestionDepth, TopicSeed } from './types';

function list(vals: string[]) {
  return vals.join(', ');
}

@Injectable()
export class PromptBuilder {
  constructor(private readonly curriculum: CurriculumRepository) {}

  buildBatchPrompt(seed: TopicSeed, nPerCell: number): string {
    const topic = this.curriculum.getTopicById(seed.domain, seed.topicId);
    const allowedConcepts = list(seed.allowedConceptLevels);
    const allowedDepths = list(seed.allowedQuestionDepths);
    const expected =
      seed.allowedConceptLevels.length * seed.allowedQuestionDepths.length * nPerCell;
    return `
Return ONLY a single JSON array for BLUEPRINT items. No markdown, no pre/post text.

Context:
- lang: ko-KR
- domain: ${seed.domain}
- topic: ${topic?.name ?? seed.topicId} (id: ${seed.topicId})
- concept_levels: [${allowedConcepts}]
- question_depths: [${allowedDepths}]

Counting:
- For EACH (concept_level × question_depth) cell, output EXACTLY ${nPerCell} items.
- FINAL array length MUST be EXACTLY ${expected}.

Item schema:
{ "domain": "OS|Network|DB|Data_Structure", "topic_id": "string",
  "concept_level": "Basic|Intermediate|Advanced", "question_depth": "Low|Mid|High",
  "prompt": "string", "intent": "string",
  "must_include": ["..."], "common_mistakes": ["..."] }

Rules:
- prompt: 20~120 Korean chars, one sentence.
- must_include: 3~5, no duplicates.
- common_mistakes: 1~3.
- High: judgement/design/trade-offs 포함. Low: 정의/what 중심(설계 금지).
- Avoid duplicates; evenly cover all cells.
- No answers/explanations.
`.trim();
  }

  buildCellPrompt(
    seed: TopicSeed,
    level: ConceptLevel,
    depth: QuestionDepth,
    chunkSize: number,
  ): string {
    const topic = this.curriculum.getTopicById(seed.domain, seed.topicId);
    return `
Return ONLY a single JSON array for BLUEPRINT items. No markdown, no pre/post text.

Context:
- lang: ko-KR
- domain: ${seed.domain}
- topic: ${topic?.name ?? seed.topicId} (id: ${seed.topicId})
- concept_level: ${level}
- question_depth: ${depth}

Counting:
- Output EXACTLY ${chunkSize} items for this single (concept_level × question_depth) cell.
- FINAL array length MUST be EXACTLY ${chunkSize}.

Item schema:
{ "domain": "OS|Network|DB|Data_Structure", "topic_id": "string",
  "concept_level": "Basic|Intermediate|Advanced", "question_depth": "Low|Mid|High",
  "prompt": "string", "intent": "string",
  "must_include": ["..."], "common_mistakes": ["..."] }

Rules:
- prompt: 20~120 Korean chars, one sentence.
- must_include: 3~5, no duplicates.
- common_mistakes: 1~3.
- High: judgement/design/trade-offs 포함. Low: 정의/what 중심(설계 금지).
- Avoid duplicates; items must all match the specified concept_level and question_depth.
- No answers/explanations.
`.trim();
  }
}
