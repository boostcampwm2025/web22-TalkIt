import { Injectable } from '@nestjs/common';

import { LlmGoldenProvider } from './llm-golden.provider';

export type RubricItem = { key: string; description: string; weight: number };

export type Rubric = { items: RubricItem[]; scale: '0-2' };

@Injectable()
export class LlmRubricProvider {
  constructor(private readonly goldenProvider: LlmGoldenProvider) {}

  /**
   * questionSummary를 기반으로 모범답안(Golden)을 생성하고,
   * 그 핵심 포인트를 기준으로 루브릭을 구성합니다.
   * - key_points, definition, examples, pitfalls 등을 활용합니다.
   * - key_points가 비어있는 경우, 안전한 폴백 3항목을 제공합니다.
   */
  async generate(params: { questionSummary: string }): Promise<Rubric> {
    const { questionSummary } = params;

    // 1) Golden(모범 답안 및 Rubric) 생성 (LLM 호출: 실패 시 provider 내부 폴백 존재)
    const golden = await this.goldenProvider.generate({ questionSummary });

    // 2) 핵심 포인트 정리: 중복 제거, 공백 정리, 길이 제한
    const normalize = (arr: unknown[], max: number) => {
      const uniq = new Set(
        (Array.isArray(arr) ? arr : [])
          .map((s) => String(s ?? '').trim())
          .filter((s) => s.length > 0)
          .map((s) => (s.length > 150 ? s.slice(0, 147) + '…' : s)),
      );
      return Array.from(uniq).slice(0, max);
    };
    const points = normalize(golden?.key_points ?? [], 6);
    const examples = normalize(golden?.examples ?? [], 3);
    const pitfalls = normalize(golden?.pitfalls ?? [], 3);

    // 3) 루브릭 항목 산출
    let items: RubricItem[] = [];
    if (points.length >= 2) {
      // key_points에 주 가중치, examples에 약한 가중치
      const positiveTotal = 1.0;

      const wKp = Math.round((positiveTotal / points.length) * 1000) / 1000;
      const kpItems = points.map((p, i) => ({ key: `kp_${i + 1}`, description: p, weight: wKp }));

      items = [...kpItems];

      // 양의 가중치 합계 보정
      const posSum = items.reduce((acc, it) => acc + it.weight, 0);
      const diff = Number((positiveTotal - posSum).toFixed(3));
      if (Math.abs(diff) >= 0.001 && items.length > 0) {
        const last = items[items.length - 1];
        if (last) last.weight = Number((last.weight + diff).toFixed(3));
      }
    } else {
      // 안전 폴백(3항목): 정의/포괄/예시
      items = [
        { key: 'definition', description: '핵심 개념의 정의를 정확히 설명한다.', weight: 0.4 },
        { key: 'coverage', description: '핵심 포인트를 누락 없이 포괄적으로 다룬다.', weight: 0.4 },
        { key: 'example', description: '적절한 예시로 개념의 이해를 보강한다.', weight: 0.2 },
      ];
      // 폴백에서도 pitfalls가 있으면 패널티 항목 추가
      if (pitfalls.length > 0) {
        const penaltyTotal = -0.2;
        const wPf = Math.round((penaltyTotal / pitfalls.length) * 1000) / 1000;
        const pfItems = pitfalls.map((p, i) => ({
          key: `pf_${i + 1}`,
          description: p,
          weight: wPf,
        }));
        items.push(...pfItems);
      }
    }

    return { items, scale: '0-2' };
  }
}
