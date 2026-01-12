import { Injectable } from '@nestjs/common';

import { CurriculumRepository } from './curriculum.repository';
import { TopicSeed } from './types';

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
You are an expert CS interviewer and rubric designer. Output must be valid JSON only.

Create interview question BLUEPRINTS for a spoken-answer CS practice service.
Return ONLY a JSON array. No markdown, no commentary.

[Context]
- Language: ko-KR
- Domain: ${seed.domain}
- Topic: ${topic?.name ?? seed.topicId}
- Topic ID: ${seed.topicId}
- Allowed concept levels: [${allowedConcepts}]
- Allowed question depths: [${allowedDepths}]
- Generate ${nPerCell} blueprints PER allowed (concept_level x question_depth) cell.
- Total expected count = ${expected}

[Definitions]
- Concept Level: Basic(single concept), Intermediate(connects multiple), Advanced(abstract + judgement/trade-offs)
- Question Depth: Low(what/definition), Mid(how/compare), High(why/judgement/design + trade-offs)

[Output JSON schema for each blueprint item]
{
  "domain": string,
  "topic_id": string,
  "concept_level": "Basic"|"Intermediate"|"Advanced",
  "question_depth": "Low"|"Mid"|"High",
  "prompt": string,
  "intent": string,
  "must_include": string[],
  "common_mistakes": string[]
}

[Hard constraints]
- Output MUST be a JSON array.
- prompt: 20~120 Korean characters, one sentence.
- must_include: 3~5 concise phrases, no duplicates.
- common_mistakes: 1~3 concise phrases.
- High depth MUST ask for judgement/design or trade-offs.
- Low depth MUST focus on definition/what (no design).
- Avoid duplicates and near-duplicates across all items.
- Do not include answers or explanations.

Now generate the blueprints.
`.trim();
  }
}
