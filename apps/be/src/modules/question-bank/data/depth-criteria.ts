export interface DepthCriteria {
  depth: 1 | 2 | 3;
  label: 'Low' | 'Mid' | 'High';
  description: string;
  questionPattern: string;
}

export const DEPTH_CRITERIA: DepthCriteria[] = [
  {
    depth: 1,
    label: 'Low',
    description: '정의·목적·기본 특성을 묻는다. 단답형 또는 1~2문장 설명 수준.',
    questionPattern: '"~란?", "~의 목적은?", "~의 기본 특성은?"',
  },
  {
    depth: 2,
    label: 'Mid',
    description:
      '동작 원리·비교·내부 구조를 묻는다. 과정을 순서대로 설명하거나 두 개념을 대비한다.',
    questionPattern: '"~의 동작 과정을 설명하세요.", "~와 ~를 비교하세요.", "~는 왜 필요한가요?"',
  },
  {
    depth: 3,
    label: 'High',
    description:
      '설계 판단·트레이드오프·실무 시나리오를 묻는다. 특정 상황에서의 선택과 근거를 제시해야 한다.',
    questionPattern:
      '"~상황에서 어떤 전략을 선택하겠나요?", "~의 한계와 대안을 논하세요.", "~를 개선한다면?"',
  },
];
