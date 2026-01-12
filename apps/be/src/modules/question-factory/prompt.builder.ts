import { TopicSeed } from './types';

function list(vals: string[]) {
  return vals.map((v) => `"${v}"`).join(', ');
}

export class PromptBuilder {
  buildBatchPrompt(seed: TopicSeed, nPerCell: number): string {
    const header = `너는 CS 면접 질문 설계자이다. 아래 주제에 대한 질문 설계 블루프린트를 JSON 배열로만 출력하라.`;
    const schema = `각 항목은 {domain, topic_id, concept_level, question_depth, prompt, intent, must_include(3~5), common_mistakes(1~3)} 필드를 포함한다.`;
    const rules = [
      '마크다운/설명 금지, JSON만 출력',
      'prompt는 한국어 한 문장, 20~120자',
      'Low는 정의/무엇, High는 판단/설계/트레이드오프 포함',
    ];
    const levels = seed.allowedConceptLevels;
    const depths = seed.allowedQuestionDepths;
    const grid = `각 (concept_level, question_depth) 조합마다 ${nPerCell}개 생성`;
    return [
      header,
      `domain=${seed.domain}, topic_id=${seed.topicId}`,
      `concept_levels=[${list(levels)}]`,
      `question_depths=[${list(depths)}]`,
      grid,
      schema,
      '규칙:',
      ...rules.map((r) => `- ${r}`),
      'JSON 배열만 출력하라.',
    ].join('\n');
  }
}
