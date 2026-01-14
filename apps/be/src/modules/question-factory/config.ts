import type { ConceptLevel, QuestionDepth } from './types';

export interface QfConfig {
  overgenFactor: number; // 1.0 means no over-generation
  chunkSize: number; // per-cell chunk size
  maxCallsPerCell: number; // safety cap for retries per cell
  exportMode: 'overwrite' | 'append' | 'merge';
  seedExisting: boolean;
  forceConceptLevels?: ConceptLevel[];
  forceQuestionDepths?: QuestionDepth[];
}

export function loadQfConfig(): QfConfig {
  const envOver = process.env.QF_OVERGEN_FACTOR;
  const envChunk = process.env.QF_CHUNK_SIZE;
  const envMaxCalls = process.env.QF_MAX_CALLS_PER_CELL;

  const n = envOver ? Number(envOver) : 1;
  const overgenFactor = Number.isFinite(n) && n > 0 ? n : 1;
  const cs = envChunk ? Number(envChunk) : 5;
  const chunkSize = Number.isFinite(cs) && cs >= 1 && cs <= 20 ? cs : 5;
  const mc = envMaxCalls ? Number(envMaxCalls) : 20;
  const maxCallsPerCell = Number.isFinite(mc) && mc >= 1 ? mc : 20;

  const modeRaw = (process.env.QF_EXPORT_MODE ?? 'overwrite').toLowerCase();
  const exportMode = (
    ['overwrite', 'append', 'merge'].includes(modeRaw) ? modeRaw : 'overwrite'
  ) as 'overwrite' | 'append' | 'merge';
  const seedExisting = (process.env.QF_SEED_EXISTING ?? 'true').toLowerCase() === 'true';
  // Optional filters via CSV envs
  const lvlCsv = (process.env.QF_FORCE_CONCEPT_LEVELS ?? '').trim();
  const depCsv = (process.env.QF_FORCE_QUESTION_DEPTHS ?? '').trim();
  const parseCsv = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const forceConceptLevels = lvlCsv ? (parseCsv(lvlCsv) as ConceptLevel[]) : undefined;
  const forceQuestionDepths = depCsv ? (parseCsv(depCsv) as QuestionDepth[]) : undefined;

  return {
    overgenFactor,
    chunkSize,
    maxCallsPerCell,
    exportMode,
    seedExisting,
    forceConceptLevels,
    forceQuestionDepths,
  };
}
