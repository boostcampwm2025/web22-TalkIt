import type { LlmClient } from '../llm.client';
import { Blueprint, ConceptLevel, QuestionDepth, TopicSeed } from '../types';

function repeatKorean(minLen: number, base: string): string {
  let s = base;
  while (s.length < minLen) s += ' '; // padding spaces are fine in length check
  return s;
}

function makePrompt(
  seed: TopicSeed,
  level: ConceptLevel,
  depth: QuestionDepth,
  idx: number,
): string {
  const topic = (seed.topicId.split('.').pop() ?? seed.topicId).replace(/_/g, ' ');
  const baseLow =
    level === 'Basic'
      ? `기초 관점에서 ${topic}의 개념을 정의하고 간단한 예시를 설명해 주세요.`
      : level === 'Intermediate'
        ? `중급 관점에서 ${topic}의 주요 목적과 사용 시점을 정리하고 용어를 구분해 주세요.`
        : `고급 관점에서 ${topic}의 배경과 전제 조건을 요약해 주세요.`;
  const baseMid =
    level === 'Basic'
      ? `기초 관점에서 ${topic}의 차이를 비교하고 동작 원리를 요약해 주세요.`
      : level === 'Intermediate'
        ? `중급 관점에서 ${topic}의 내부 동작 흐름과 구성 요소 관계를 설명해 주세요.`
        : `고급 관점에서 ${topic}의 시스템적 영향과 병목 요소를 설명해 주세요.`;
  const baseHigh =
    level === 'Basic'
      ? `기초 관점에서 ${topic}의 선택 기준과 근거를 제시하고 트레이드오프를 간단히 논의해 주세요.`
      : level === 'Intermediate'
        ? `중급 관점에서 ${topic}의 설계 대안의 장단점과 트레이드오프를 평가해 주세요.`
        : `고급 관점에서 ${topic}의 설계 철학과 선택 근거, 트레이드오프를 논증해 주세요.`;
  const byDepth = depth === 'Low' ? baseLow : depth === 'Mid' ? baseMid : baseHigh;
  const variantsLowBasic = [
    '핵심 용어 정의 분류 예시 나열',
    '간단 사례 요약 핵심 포인트',
    '개념 범위 한계 유사 개념',
  ];
  const variantsLowInter = [
    '사용 시점 맥락 전제 조건',
    '주의 사항 실수 방지 체크',
    '유사 개념 구분 비교 기준',
  ];
  const variantsMidBasic = [
    '비교 기준 정리 핵심 차이',
    '동작 절차 개요 흐름 단계',
    '조건과 영향 결과 원인',
  ];
  const variantsMidInter = [
    '구성 요소 설명 상호 작용',
    '흐름 단계 세부 과정',
    '제약과 고려 설계 선택',
  ];
  const variantsHighBasic = ['선택 근거 판단 기준', '장단점 개요 우선 순위', '설계 기준 비교 선택'];
  const variantsHighInter = [
    '설계 대안 평가 근거',
    '트레이드오프 판단 이유',
    '정책 선택 이유 사례',
  ];
  const pool =
    depth === 'Low'
      ? level === 'Basic'
        ? variantsLowBasic
        : variantsLowInter
      : depth === 'Mid'
        ? level === 'Basic'
          ? variantsMidBasic
          : variantsMidInter
        : level === 'Basic'
          ? variantsHighBasic
          : variantsHighInter;
  const extra = pool[idx % pool.length];
  const levelTag =
    level === 'Basic' ? '학습 초반' : level === 'Intermediate' ? '실무 중간' : '심화 단계';
  const depthTag = depth === 'Low' ? '정의 중심' : depth === 'Mid' ? '비교 중심' : '판단 중심';
  const uniqMap: Record<string, string> = {
    'Basic-Low': '바나나 도서 산책',
    'Basic-Mid': '호수 자전거 파도',
    'Basic-High': '은하 로켓 별빛',
    'Intermediate-Low': '대나무 비단 호랑이',
    'Intermediate-Mid': '사막 낙타 태양',
    'Intermediate-High': '지휘 교향 악장',
    'Advanced-Low': '무한 기저 복합',
    'Advanced-Mid': '물리 위상 다항',
    'Advanced-High': '논증 귀납 연역',
  };
  const key = `${level}-${depth}` as const;
  const combo = uniqMap[key] ?? '';
  const iMap: Record<number, string> = {
    0: '가 나 다 라 마 바',
    1: '사 아 자 차 카 타',
    2: '파 하 거 너 더 러',
  };
  const iTag = iMap[idx % 3] ?? '';
  const base = `${byDepth} ${extra} ${levelTag} ${depthTag} ${combo} ${iTag}`;
  return repeatKorean(22, base);
}

function phrases(seed: TopicSeed): { include: string[]; mistakes: string[] } {
  const t = seed.topicId.split('.').pop() ?? seed.topicId;
  const p = t.replace(/_/g, ' ');
  return {
    include: [p, '핵심 용어', '예시', '비교', '조건'].slice(0, 5),
    mistakes: ['모호한 정의', '잘못된 비교', '근거 부족'].slice(0, 3),
  };
}

export class MockLlmClient implements LlmClient {
  generateBlueprintBatch(prompt: string, seed: TopicSeed, nPerCell: number): Promise<unknown> {
    const out: Blueprint[] = [];
    const { include, mistakes } = phrases(seed);
    for (const level of seed.allowedConceptLevels) {
      for (const depth of seed.allowedQuestionDepths) {
        for (let i = 0; i < nPerCell; i++) {
          const includeCount = 3 + (i % 3); // 3,4,5
          const mistakeCount = 1 + (i % 3 ? 1 : 0); // 1 or 2
          out.push({
            domain: seed.domain,
            topic_id: seed.topicId,
            concept_level: level,
            question_depth: depth,
            prompt: makePrompt(seed, level, depth, i),
            intent: '핵심 개념 이해와 설명 능력 평가',
            must_include: include.slice(0, Math.min(include.length, includeCount)),
            common_mistakes: mistakes.slice(0, Math.min(mistakes.length, mistakeCount)),
          });
        }
      }
    }
    return Promise.resolve(out);
  }
}
