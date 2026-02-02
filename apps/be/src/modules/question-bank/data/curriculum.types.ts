export type Domain = 'OS' | 'NETWORK' | 'DB' | 'DATA_STRUCTURE';

export type ConceptLevel = 'Basic' | 'Intermediate' | 'Advanced';

export interface KeyConcept {
  term: string;
  conceptLevel: ConceptLevel;
}

export interface Chapter {
  chapter: number;
  title: string;
  keyConcepts: KeyConcept[];
}

export interface Curriculum {
  domain: Domain;
  chapters: Chapter[];
}

export type CurriculumMap = Record<Domain, Curriculum>;

export const CONCEPT_LEVEL_MAP: Record<ConceptLevel, 1 | 2 | 3> = {
  Basic: 1,
  Intermediate: 2,
  Advanced: 3,
};
