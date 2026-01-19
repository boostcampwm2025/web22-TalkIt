/*
 * JSONL 질문은행을 DB로 import하는 스크립트 (Prisma)
 * 예:
 *  - local 파일: ts-node scripts/import-questionbank.ts -source local -path ./resource/os_terms_questions.jsonl
 *  - local 디렉토리: ts-node scripts/import-questionbank.ts -source local -path ./resource
 *  - object: ts-node scripts/import-questionbank.ts -source object
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';

type Source = 'local' | 'object';

function parseArgs() {
  const args = process.argv.slice(2);
  const res: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (typeof key !== 'string' || !key.startsWith('-')) continue;
    const val = args[i + 1];
    if (typeof val === 'undefined' || val.startsWith('-')) {
      res[key] = true;
    } else {
      res[key] = val;
      i++;
    }
  }
  return res;
}

// 난이도 표준화: 입력이 EAZY/EASY/MEDIUM/HARD 또는 Basic/Intermediate/Advanced 모두 허용
function mapDifficulty(val: string): 'EASY' | 'MEDIUM' | 'HARD' | null {
  if (!val) return null;
  const v = String(val).trim();
  if (/^basic$/i.test(val)) return 'EASY';
  if (/^intermediate$/i.test(val)) return 'MEDIUM';
  if (/^advanced$/i.test(val)) return 'HARD';
  return null;
}

function mapDomain(val: string): 'OS' | 'NETWORK' | 'DB' | 'DATA_STRUCTURE' | null {
  const v = (val || '').toUpperCase();
  if (['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'].includes(v)) return v as any;
  return null;
}

async function getObjectStream(): Promise<Readable> {
  const bucket = process.env.OBJECT_STORAGE_BUCKET_NAME ?? '';
  const key = 'questionbank/os_terms_questions.jsonl';
  const endpoint = process.env.NCLOUD_OBJECT_ENDPOINT ?? 'https://kr.object.ncloudstorage.com';
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'kr-standard',
      endpoint,
      credentials: {
        accessKeyId: process.env.NCP_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.NCP_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return out.Body as Readable;
  } catch (e) {
    throw new Error(`Failed to get object from storage: ${(e as any)?.message}`);
  }
}

async function main() {
  const parsed = parseArgs();
  const source = typeof parsed['-source'] === 'string' ? parsed['-source'] : '';
  const filePath = typeof parsed['-path'] === 'string' ? parsed['-path'] : '';
  if (!source || !['local', 'object'].includes(source)) {
    console.error(
      'Usage: ts-node scripts/import-questionbank.ts -source local|object [-path <file>]',
    );
    process.exit(1);
  }

  const prisma = new PrismaService();
  await prisma.$connect?.();

  async function importFromStream(stream: Readable) {
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let line = 0;
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const batch: any[] = [];
    const BATCH_SIZE = 1000;

    async function flush() {
      if (!batch.length) return;
      for (const item of batch) {
        try {
          const unique = {
            category: item.category,
            difficulty: item.difficulty,
            topicId: item.topicId,
            contentHash: item.contentHash,
          };
          const res = await (prisma as any).question.upsert({
            where: { category_difficulty_topicId_contentHash: unique },
            create: {
              ...unique,
              content: item.content,
              mustInclude: item.mustInclude,
              timeLimitSec: 180,
            },
            update: { content: item.content, mustInclude: item.mustInclude },
          });
          if (res?.createdAt === res?.updatedAt || !res?.updatedAt) inserted++;
          else updated++;
        } catch (e) {
          failed++;
          console.warn('upsert failed:', (e as any)?.message);
        }
      }
      batch.length = 0;
    }

    for await (const raw of rl) {
      line++;
      const s = String(raw).trim();
      if (!s) continue;
      try {
        const j = JSON.parse(s);
        const domain = mapDomain(j.domain);
        const difficulty = mapDifficulty(j.concept_level);
        const topicId = j.topic_id as string;
        const content = j.prompt as string;
        const mustInclude = Array.isArray(j.must_include) ? j.must_include : [];
        if (!domain || !difficulty || !topicId || !content) {
          failed++;
          continue;
        }
        const contentHash = createHash('sha256').update(content, 'utf8').digest('hex');
        // DB 필드명은 category
        batch.push({ category: domain, difficulty, topicId, content, contentHash, mustInclude });
        if (batch.length >= BATCH_SIZE) await flush();
      } catch (e) {
        failed++;
        console.warn('parse failed at line', line, (e as any)?.message);
      }
    }
    await flush();
    return { line, inserted, updated, failed };
  }

  let total = { line: 0, inserted: 0, updated: 0, failed: 0 };
  if (source === 'local') {
    if (!filePath) {
      console.error('local source requires -path');
      process.exit(1);
    }
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      const files = readdirSync(filePath)
        .filter((f) => f.toLowerCase().endsWith('.jsonl'))
        .map((f) => join(filePath, f))
        .sort();
      if (!files.length) {
        console.error('No .jsonl files in directory:', filePath);
        process.exit(1);
      }
      for (const f of files) {
        console.log('Importing', f);
        const res = await importFromStream(createReadStream(f));
        total.line += res.line;
        total.inserted += res.inserted;
        total.updated += res.updated;
        total.failed += res.failed;
      }
    } else {
      const res = await importFromStream(createReadStream(filePath));
      total = res;
    }
  } else {
    const stream = await getObjectStream();
    total = await importFromStream(stream);
  }

  console.log(
    `lines=${total.line} inserted=${total.inserted} updated=${total.updated} failed=${total.failed}`,
  );
  await prisma.$disconnect?.();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
