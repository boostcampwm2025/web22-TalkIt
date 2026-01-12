export interface QfConfig {
  overgenFactor: number; // 1.0 means no over-generation
  chunkSize: number; // per-cell chunk size
  maxCallsPerCell: number; // safety cap for retries per cell
  exportMode: 'overwrite' | 'append' | 'merge';
  seedExisting: boolean;
}

export function loadQfConfig(): QfConfig {
  /* eslint-disable turbo/no-undeclared-env-vars */
  const envOver = process.env.QF_OVERGEN_FACTOR;
  const envChunk = process.env.QF_CHUNK_SIZE;
  const envMaxCalls = process.env.QF_MAX_CALLS_PER_CELL;
  /* eslint-enable turbo/no-undeclared-env-vars */
  const n = envOver ? Number(envOver) : 1;
  const overgenFactor = Number.isFinite(n) && n > 0 ? n : 1;
  const cs = envChunk ? Number(envChunk) : 5;
  const chunkSize = Number.isFinite(cs) && cs >= 1 && cs <= 20 ? cs : 5;
  const mc = envMaxCalls ? Number(envMaxCalls) : 20;
  const maxCallsPerCell = Number.isFinite(mc) && mc >= 1 ? mc : 20;
  /* eslint-disable turbo/no-undeclared-env-vars */
  const modeRaw = (process.env.QF_EXPORT_MODE ?? 'overwrite').toLowerCase();
  const exportMode = (
    ['overwrite', 'append', 'merge'].includes(modeRaw) ? modeRaw : 'overwrite'
  ) as 'overwrite' | 'append' | 'merge';
  const seedExisting = (process.env.QF_SEED_EXISTING ?? 'true').toLowerCase() === 'true';
  /* eslint-enable turbo/no-undeclared-env-vars */
  return { overgenFactor, chunkSize, maxCallsPerCell, exportMode, seedExisting };
}
