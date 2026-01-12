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
}
