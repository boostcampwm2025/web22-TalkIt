import { NestFactory } from '@nestjs/core';

import { AdminModule } from '../modules/admin/admin.module';
import { AdminService } from '../modules/admin/admin.service';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';

type Domain = 'OS' | 'Network' | 'DB' | 'Data_Structure';

async function main() {
  const app = await NestFactory.createApplicationContext(AdminModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const admin = app.get(AdminService);
    const resourcePath = path.resolve(process.cwd(), 'resources/curriculum/curriculum.v1.2.json');
    const raw = fs.readFileSync(resourcePath, 'utf8');
    const json = JSON.parse(raw);

    const domains: Domain[] = ['OS', 'Network', 'DB', 'Data_Structure'];
    const skipIds = new Set<string>(['os.pt.process_vs_thread']);
    const version = 'v1';
    const nPerCell = 10;

    const jobs: { domain: Domain; topicId: string; jobId?: string }[] = [];
    for (const d of domains) {
      const sections = json?.domains?.[d] ?? {};
      for (const arr of Object.values(sections)) {
        for (const t of arr as any[]) {
          const id = t?.id as string;
          if (!id || skipIds.has(id)) continue;
          const res = await admin.enqueueBlueprintJob({
            domain: d,
            topicId: id,
            version,
            nPerCell,
          });
          jobs.push({ domain: d, topicId: id, jobId: res.jobId });
          console.log(`[enqueue] ${d} :: ${id} -> jobId=${res.jobId}`);
        }
      }
    }
    console.log(`Enqueued ${jobs.length} jobs (skip ${[...skipIds].join(',')}).`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('enqueue_all_topics failed:', e);
  process.exit(1);
});
