import { DATA_STRUCTURE_CURRICULUM } from './curriculum-data-structure';
import { DB_CURRICULUM } from './curriculum-db';
import { NETWORK_CURRICULUM } from './curriculum-network';
import { OS_CURRICULUM } from './curriculum-os';
import { CurriculumMap } from './curriculum.types';

export const CURRICULA: CurriculumMap = {
  OS: OS_CURRICULUM,
  NETWORK: NETWORK_CURRICULUM,
  DB: DB_CURRICULUM,
  DATA_STRUCTURE: DATA_STRUCTURE_CURRICULUM,
};

export { DEPTH_CRITERIA } from './depth-criteria';
export type { DepthCriteria } from './depth-criteria';
export type {
  Domain,
  ConceptLevel,
  KeyConcept,
  Chapter,
  Curriculum,
  CurriculumMap,
} from './curriculum.types';
export { CONCEPT_LEVEL_MAP } from './curriculum.types';
