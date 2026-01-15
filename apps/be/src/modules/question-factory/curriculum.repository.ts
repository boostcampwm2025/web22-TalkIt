import { Injectable } from '@nestjs/common';

import { ConceptLevel, Domain, QuestionDepth } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface CurriculumTopic {
  id: string;
  name: string;
  recommended_concept_levels: ConceptLevel[];
  recommended_question_depths: QuestionDepth[];
  default_n_per_cell?: number;
  recommended_time_limit_sec?: number;
  splits?: string[];
}

interface CurriculumRoot {
  version: string;
  language: string;
  defaults: {
    recommended_time_limit_sec: number;
    default_n_per_cell: number;
    prompt_language: string;
  };
  domains: Record<string, Record<string, CurriculumTopic[]>>;
}

@Injectable()
export class CurriculumRepository {
  private data: CurriculumRoot;

  constructor() {
    const explicitPath = process.env.QF_CURRICULUM_PATH;
    const version = process.env.QF_CURRICULUM_VERSION || 'v1.2';

    const defaultPath = path.resolve(
      process.cwd(),
      'resources/curriculum',
      `curriculum.${version}.json`,
    );
    const filePath = explicitPath ? path.resolve(process.cwd(), explicitPath) : defaultPath;

    // TEMP: curriculum file usage is paused; bypass file read
    // const raw = fs.readFileSync(filePath, 'utf-8');
    // const parsed = JSON.parse(raw) as unknown;
    // if (!parsed || typeof parsed !== 'object') {
    //   throw new Error('invalid_curriculum_format');
    // }
    // this.data = parsed as CurriculumRoot;

    // Fallback minimal dataset to keep app running
    this.data = {
      version: 'stub',
      language: 'ko',
      defaults: {
        recommended_time_limit_sec: 60,
        default_n_per_cell: 1,
        prompt_language: 'ko',
      },
      domains: {},
    };
  }

  getDefaults() {
    return this.data.defaults;
  }

  listTopics(domain: Domain): CurriculumTopic[] {
    const d = this.data.domains[domain];
    if (!d) return [];
    const all: CurriculumTopic[] = [];
    for (const section of Object.values(d)) {
      all.push(...section);
    }
    return all;
  }

  getTopicById(
    domain: Domain,
    topicId: string,
  ): {
    id: string;
    name: string;
    allowedConceptLevels: ConceptLevel[];
    allowedQuestionDepths: QuestionDepth[];
    defaultNPerCell: number;
  } | null {
    const topics = this.listTopics(domain);
    const found = topics.find((t) => t.id === topicId);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      allowedConceptLevels: found.recommended_concept_levels,
      allowedQuestionDepths: found.recommended_question_depths,
      defaultNPerCell: found.default_n_per_cell ?? this.data.defaults.default_n_per_cell,
    };
  }
}
