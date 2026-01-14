import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { AdminService } from '../modules/admin/admin.service';
import { TermCurriculumRepository } from '../modules/question-factory/term-curriculum.repository';
import 'dotenv/config';
import 'reflect-metadata';

type Domain = 'OS' | 'Network' | 'DB' | 'Data_Structure';
type Level = 'Basic' | 'Intermediate' | 'Advanced';

function parseDomains(env?: string): Domain[] {
  const all: Domain[] = ['OS', 'Network', 'DB', 'Data_Structure'];
  const s = (env ?? '').trim();
  if (!s) return all;
  const parts = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean) as Domain[];
  const filtered = parts.filter((d) => (all as string[]).includes(d));
  return filtered.length ? filtered : all;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const admin = app.get(AdminService);
    const termRepo = app.get(TermCurriculumRepository);

    const version = process.env.QF_VERSION || 'v1';
    const itemsPerTerm = Number(process.env.QF_TERM_COUNT || '3');
    const limitPerLevel = Number(process.env.QF_LIMIT_TERMS_PER_LEVEL || '0');
    const domains = parseDomains(process.env.QF_DOMAINS);

    const levels: Level[] = ['Basic', 'Intermediate', 'Advanced'];
    let totalJobs = 0;

    for (const domain of domains) {
      for (const level of levels) {
        const terms = termRepo.listTerms(domain, level);
        const pick = limitPerLevel > 0 ? terms.slice(0, limitPerLevel) : terms;
        for (const term of pick) {
          const body = {
            mode: 'term' as const,
            domain,
            version,
            conceptLevel: level,
            term,
            count: itemsPerTerm,
          };
          const res = await admin.enqueueBlueprintJob(body as any);
          totalJobs++;
          console.log(`[enqueue] ${domain}/${level} :: ${term} -> jobId=${res.jobId}`);
        }
      }
    }
    console.log(`Enqueued ${totalJobs} LLM jobs for domains: ${domains.join(', ')}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('enqueue_terms_by_domain failed:', e);
  process.exit(1);
});
