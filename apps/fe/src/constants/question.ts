import {
  QUESTION_CATEGORY,
  QUESTION_DIFFICULTY,
  type QuestionCategory,
  type QuestionDifficulty,
} from '@repo/shared/constants/learning';

import { Cpu, Database, type LucideIcon, Share2 } from 'lucide-react';

type TopicConfig = {
  id: QuestionCategory;
  label: string;
  description: string;
  Icon: LucideIcon;
};

export const QUESTION_CATEGORY_CONFIG: Record<QuestionCategory, TopicConfig> = {
  [QUESTION_CATEGORY.NETWORK]: {
    id: QUESTION_CATEGORY.NETWORK,
    label: '네트워크',
    description: 'HTTP, TCP/IP, OSI 7계층 등',
    Icon: Share2,
  },
  [QUESTION_CATEGORY.OS]: {
    id: QUESTION_CATEGORY.OS,
    label: '운영체제',
    description: '프로세스, 스레드, 메모리 관리',
    Icon: Cpu,
  },
  [QUESTION_CATEGORY.DATABASE]: {
    id: QUESTION_CATEGORY.DATABASE,
    label: '데이터베이스',
    description: 'SQL, 트랜잭션, 인덱싱 등',
    Icon: Database,
  },
  [QUESTION_CATEGORY.STRUCTURE]: {
    id: QUESTION_CATEGORY.STRUCTURE,
    label: '자료구조',
    description: '스택, 큐, 트리, 그래프 등',
    Icon: Share2,
  },
};

type DifficultyConfig = {
  value: QuestionDifficulty;
  label: string;
};

export const QUESTION_DIFFICULTY_CONFIG: Record<QuestionDifficulty, DifficultyConfig> = {
  [QUESTION_DIFFICULTY.EASY]: {
    value: QUESTION_DIFFICULTY.EASY,
    label: '초급',
  },
  [QUESTION_DIFFICULTY.MEDIUM]: {
    value: QUESTION_DIFFICULTY.MEDIUM,
    label: '중급',
  },
  [QUESTION_DIFFICULTY.HARD]: {
    value: QUESTION_DIFFICULTY.HARD,
    label: '고급',
  },
};
