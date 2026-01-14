export type Domain = 'OS' | 'Network' | 'DB' | 'Data_Structure';

export type ConceptLevel = 'Basic' | 'Intermediate' | 'Advanced';

export type QuestionDepth = 'Low' | 'Mid' | 'High';

export interface Blueprint {
  domain: Domain;
  topic_id: string;
  concept_level: ConceptLevel;
  question_depth: QuestionDepth;
  prompt: string; // Korean, one sentence, 20~120 chars
  intent: string; // one sentence
  must_include: string[]; // 3~5 concise phrases
  common_mistakes: string[]; // 1~3 concise phrases
}

// Term 모드 전용 블루프린트
export interface TermBlueprint {
  domain: Domain;
  topic_id: string; // term:{term}
  concept_level: ConceptLevel; // 요청 레벨 고정
  question_depth: QuestionDepth; // Low 고정(기본 정책)
  prompt: string;
  intent: string; // 제한된 의도 집합
  must_include: string[];
}

export interface TopicSeed {
  domain: Domain;
  topicId: string;
  allowedConceptLevels: ConceptLevel[];
  allowedQuestionDepths: QuestionDepth[];
}

export interface GenerationRequest {
  version: string; // e.g., v1
  nPerCell: number;
  seed: TopicSeed;
}

export interface GenerationResult {
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  outputPath: string;
  // For term mode batch (multiple terms), provide list as well
  outputPaths?: string[];
}

// Term-mode request (single term)
export interface TermGenerationRequest {
  version: string; // e.g., v1
  domain: Domain;
  term: string;
  conceptLevel: ConceptLevel;
  count: number; // number of items to generate (per fixed depth policy)
}

// Admin enqueue DTOs
export type EnqueueTopicJob = {
  mode?: 'topic';
  domain: Domain;
  topicId: string;
  version: string;
  nPerCell: number;
};

export type EnqueueTermJob = {
  mode: 'term';
  domain: Domain;
  version: string;
  conceptLevel: ConceptLevel;
  term?: string; // optional for batch
  count?: number; // number of terms when batching without explicit term (default 1)
};

export type EnqueueJobBody = EnqueueTopicJob | EnqueueTermJob;
