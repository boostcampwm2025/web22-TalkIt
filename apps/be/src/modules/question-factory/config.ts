export interface QfConfig {
  overgenFactor: number; // 1.0 means no over-generation
}

export function loadQfConfig(): QfConfig {
  /* eslint-disable turbo/no-undeclared-env-vars */
  const env = process.env.QF_OVERGEN_FACTOR;
  /* eslint-enable turbo/no-undeclared-env-vars */
  const n = env ? Number(env) : 1;
  const overgenFactor = Number.isFinite(n) && n > 0 ? n : 1;
  return { overgenFactor };
}
