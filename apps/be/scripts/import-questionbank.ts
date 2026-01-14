/*
 * JSONL 질문은행을 DB로 import하는 스크립트 (Prisma)
 * 예:
 *  - local 파일: ts-node scripts/import-questionbank.ts -source local -path ./resource/os_terms_questions.jsonl
 *  - object: ts-node scripts/import-questionbank.ts -source object
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
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

function mapDifficulty(val: string): 'Basic' | 'Intermediate' | 'Advanced' | null {
  if (!val) return null;
  if (/^basic$/i.test(val)) return 'Basic';
  if (/^intermediate$/i.test(val)) return 'Intermediate';
  if (/^advanced$/i.test(val)) return 'Advanced';
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

  let stream: Readable;
  if (source === 'local') {
    if (!filePath) {
      console.error('local source requires -path');
      process.exit(1);
    }
    stream = createReadStream(filePath);
  } else {
    stream = await getObjectStream();
  }

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
          domain: item.domain,
          difficulty: item.difficulty,
          topicId: item.topicId,
          contentHash: item.contentHash,
        };
        const res = await (prisma as any).question.upsert({
          where: { domain_difficulty_topicId_contentHash: unique },
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
      batch.push({ domain, difficulty, topicId, content, contentHash, mustInclude });
      if (batch.length >= BATCH_SIZE) await flush();
    } catch (e) {
      failed++;

      console.warn('parse failed at line', line, (e as any)?.message);
    }
  }
  await flush();

  console.log(`lines=${line} inserted=${inserted} updated=${updated} failed=${failed}`);
  await prisma.$disconnect?.();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
