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
  "must_include": ["..."] }

Rules:
- prompt: 20~120 Korean chars, one sentence, ends with "요?".
- must_include: 3~5, no duplicates.
- must_include는 해당 Concept(토픽)을 설명할 때 반드시 포함되어야 하는 핵심 단어/구입니다.
- Do NOT include common_mistakes field in output.
- High: judgement/design/trade-offs 포함. Low: 정의/what 중심(설계 금지).
- If question_depth is Low, craft definition/understanding style questions. Prefer patterns like
  "…란 무엇인가요?" or "…는 무엇을 의미하나요?", written naturally for the given topic.
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
    const lowDepthHint =
      depth === 'Low'
        ? '\n- Use definition/understanding style. Prefer patterns like "…란 무엇인가요?" or "…는 무엇을 의미하나요?"\n'
        : '';
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
  "concept_level": "Basic|Intermediate|Advanced", "question_depth": "Low",
  "prompt": "string", "intent": "string",
  "must_include": ["..."] }

Rules:
- prompt: 20~120 Korean chars, one sentence, ends with "요?".
- must_include: 3~5, no duplicates.
- must_include는 해당 Concept(토픽)을 설명할 때 반드시 포함되어야 하는 핵심 단어/구입니다.
- Low: 정의/what 중심(설계 금지).
- ${lowDepthHint.trim()}
- Avoid duplicates; items must all match the specified concept_level and question_depth.
- No answers/explanations.
`.trim();
  }

  // Term-mode helper: delegates to buildCellPrompt with a synthetic seed
  buildTermCellPrompt(
    domain: TopicSeed['domain'],
    term: string,
    level: ConceptLevel,
    depth: QuestionDepth,
    chunkSize: number,
  ): string {
    const termLabel = term;
    return `
Return ONLY a single JSON array for BLUEPRINT items. No markdown, no pre/post text.

Context:
- lang: ko-KR
- domain: ${domain}
- term: ${termLabel}
- concept_level: ${level}
- question_depth: ${depth}

Counting:
- Output EXACTLY ${chunkSize} items for this single (term × concept_level × question_depth) cell.
- FINAL array length MUST be EXACTLY ${chunkSize}.

Item schema:
{ "domain": "OS|Network|DB|Data_Structure", "topic_id": "string",
  "concept_level": "Basic|Intermediate|Advanced", "question_depth": "Low|Mid|High",
  "prompt": "string", "intent": "string",
  "must_include": ["..."] }

Rules:
- prompt: 20~120 Korean chars, one sentence, ends with "요?".
- must_include: 3~5, no duplicates.
- must_include는 해당 Concept(용어)을 설명할 때 반드시 포함되어야 하는 핵심 단어/구입니다.
- topic_id는 반드시 정확히 "${termLabel}"로 설정하세요. 대소문자/공백/추가 텍스트 금지.
- Low: 정의/what 중심(설계/트레이드오프 금지). 자연스러운 정의형 문장(예: "…란 무엇인가요?", "…의 목적/역할은 무엇인가요?")을 선호합니다.
- JSON 배열만 출력.
- 중복 금지. 지정된 concept_level, question_depth를 모두 만족해야 합니다.
- 답변/해설 금지.
\n+Pinned item (index 0): 아래 형식을 따르세요.
{
  "domain": "${domain}",
  "topic_id": "${termLabel}",
  "concept_level": "${level}",
  "question_depth": "Low",
  "intent": "정의 확인",
  "prompt": "${domain}에서 '${termLabel}'(이)란 무엇이며 주요 특징은 어떤 것들이 있나요?",
  "must_include": ["..."]
}
  - must_include는 해당 Concept(용어)을 설명할 때 반드시 포함되어야 하는 핵심 단어/구입니다.

\n+Remaining items (index 1..${Math.max(1, chunkSize - 1)}):
- 모두 Low: 정의/what 중심(설계/트레이드오프 금지). 자연스러운 정의형 문장(예: "…란 무엇인가요?", "…의 목적/역할은 무엇인가요?")을 선호합니다.
- 질문 intent 우선순위: 기능 이해, 목적 파악 등 기본 개념 위주로 출제하세요.
`.trim();
  }
}
