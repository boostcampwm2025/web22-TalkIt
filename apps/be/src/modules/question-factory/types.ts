export type Domain = 'OS' | 'Network' | 'DB' | 'Data_Structure';

export type ConceptLevel = 'Basic' | 'Intermediate' | 'Advanced';

export type QuestionDepth = 'Low' | 'Mid' | 'High';

export interface GenerationOptions {
  domain: Domain;
  conceptLevel: ConceptLevel;
  questionDepth: QuestionDepth;
  term?: string;
  count: number;
}
