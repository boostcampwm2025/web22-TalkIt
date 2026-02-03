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
    questionPattern: '"~이 무엇인가요?", "~의 목적은 무엇인가요?", "~의 기본 특성은 어떤 건가요?"',
  },
  {
    depth: 2,
    label: 'Mid',
    description:
      '동작 원리·비교·내부 구조를 묻는다. 과정을 순서대로 설명하거나 두 개념을 대비한다.',
    questionPattern:
      '"~의 동작 과정은 어떻게 되나요?", "~와 ~의 차이는 무엇인가요?", "~는 왜 필요한가요?"',
  },
  {
    depth: 3,
    label: 'High',
    description:
      '설계 판단·트레이드오프·실무 시나리오를 묻는다. 특정 상황에서의 선택과 근거를 제시해야 한다.',
    questionPattern:
      '"~상황에서 어떤 전략을 선택하실 건가요?", "~의 한계와 대안은 무엇이 있을까요?", "~를 개선한다면 어떻게 하실 건가요?"',
  },
];
