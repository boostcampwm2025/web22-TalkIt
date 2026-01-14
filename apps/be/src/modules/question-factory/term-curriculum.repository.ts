import { Injectable } from '@nestjs/common';

import type { ConceptLevel, Domain } from './types';
import * as fs from 'fs';
import * as path from 'path';

type LevelMap = {
  Basic: string[];
  Intermediate: string[];
  Advanced: string[];
};

interface TermCurriculumRoot {
  domains: Record<Domain, Partial<LevelMap>>;
}

@Injectable()
export class TermCurriculumRepository {
  private data: TermCurriculumRoot;

  constructor() {
    /* eslint-disable turbo/no-undeclared-env-vars */
    const explicit = process.env.TERM_CURRICULUM_PATH;
    /* eslint-enable turbo/no-undeclared-env-vars */
    const defaultPath = path.resolve(
      process.cwd(),
      'resources/curriculum/term_curriculum.v1.0.json',
    );
    const filePath = explicit ? path.resolve(process.cwd(), explicit) : defaultPath;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid_term_curriculum');
    this.data = parsed as TermCurriculumRoot;
  }

  listTerms(domain: Domain, conceptLevel: ConceptLevel): string[] {
    const d = (this.data.domains as any)?.[domain] as Partial<LevelMap> | undefined;
    if (!d) return [];
    const arr = (d as any)?.[conceptLevel] as string[] | undefined;
    return Array.isArray(arr) ? arr.slice() : [];
  }

  getAllTerms(domain: Domain): LevelMap {
    const d = (this.data.domains as any)?.[domain] as Partial<LevelMap> | undefined;
    return {
      Basic: (d?.Basic ?? []).slice(),
      Intermediate: (d?.Intermediate ?? []).slice(),
      Advanced: (d?.Advanced ?? []).slice(),
    } as LevelMap;
  }
}
