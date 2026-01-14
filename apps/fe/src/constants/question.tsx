import {
  QUESTION_DIFFICULTY,
  QUESTION_TOPIC,
  type QuestionDifficulty,
  type QuestionTopic,
} from '@repo/shared/constants/learning';

import { Cpu, Database, type LucideIcon, Share2 } from 'lucide-react';

type TopicConfig = {
  id: QuestionTopic;
  label: string;
  description: string;
  Icon: LucideIcon;
};

export const QUESTION_TOPIC_CONFIG: Record<QuestionTopic, TopicConfig> = {
  [QUESTION_TOPIC.NETWORK]: {
    id: QUESTION_TOPIC.NETWORK,
    label: '네트워크',
    description: 'HTTP, TCP/IP, OSI 7계층 등',
    Icon: Share2,
  },
  [QUESTION_TOPIC.OS]: {
    id: QUESTION_TOPIC.OS,
    label: '운영체제',
    description: '프로세스, 스레드, 메모리 관리',
    Icon: Cpu,
  },
  [QUESTION_TOPIC.DATABASE]: {
    id: QUESTION_TOPIC.DATABASE,
    label: '데이터베이스',
    description: 'SQL, 트랜잭션, 인덱싱 등',
    Icon: Database,
  },
  [QUESTION_TOPIC.STRUCTURE]: {
    id: QUESTION_TOPIC.STRUCTURE,
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

export const QUESTION_TOPIC_KR = {
  OS: '운영체제',
  NETWORK: '네트워크',
  DATABASE: '데이터베이스',
  STRUCTURE: '자료구조',
} as const satisfies Record<QuestionTopic, string>;

export const QUESTION_DIFFICULTY_KR = {
  EASY: '하급',
  MEDIUM: '중급',
  HARD: '상급',
} as const satisfies Record<QuestionDifficulty, string>;
