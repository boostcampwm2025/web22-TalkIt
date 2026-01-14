import { NestFactory } from '@nestjs/core';

import { QuestionFactoryModule } from '../modules/question-factory/question-factory.module';
import { QuestionFactoryService } from '../modules/question-factory/question-factory.service';
import { TermCurriculumRepository } from '../modules/question-factory/term-curriculum.repository';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';

type Level = 'Basic' | 'Intermediate' | 'Advanced';

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  // Force real LLM for this script unless overridden from env before run
  if (!process.env.LLM_MODE) process.env.LLM_MODE = 'real';

  const app = await NestFactory.createApplicationContext(QuestionFactoryModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const qfs = app.get(QuestionFactoryService);
    const termRepo = app.get(TermCurriculumRepository);
    const version = process.env.QF_VERSION || 'v1';
    const perTermCount = Number(process.env.QF_TERM_COUNT || '3');
    const perLevelTerms = Number(process.env.QF_VERIFY_N_TERMS || '3');

    let ok = true;
    for (const level of ['Basic', 'Intermediate', 'Advanced'] as Level[]) {
      const terms = termRepo.listTerms('OS', level);
      const pick = terms.slice(0, Math.min(perLevelTerms, terms.length));
      for (const term of pick) {
        const res = await qfs.generateByTerm({
          version,
          domain: 'OS',
          term,
          conceptLevel: level,
          count: perTermCount,
        });
        const expectedPath = path.resolve(
          process.cwd(),
          'output',
          'question-bank',
          version,
          'term',
          `OS__term__${level}__${slug(term)}.jsonl`,
        );
        const exists = fs.existsSync(expectedPath);
        if (!exists) {
          console.error('[OS Verify LLM] 파일 없음:', expectedPath);
          ok = false;
        } else {
          console.log('[OS Verify LLM] OK:', expectedPath, 'accepted=', res.acceptedCount);
        }
      }
    }
    if (!ok) process.exit(2);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('verify_term_os_llm failed:', e);
  process.exit(1);
});
