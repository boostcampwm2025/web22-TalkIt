/*
 * question-bank version JSON을 Object Storage에서 읽어 DB로 import하는 스크립트 (Prisma)
 * 사용법:
 *  ts-node scripts/import-questionbank.ts
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import 'dotenv/config';
import { createHash } from 'node:crypto';

const BUCKET = process.env.OBJECT_STORAGE_BUCKET_NAME ?? '';
const ENDPOINT = process.env.NCLOUD_OBJECT_ENDPOINT ?? 'https://kr.object.ncloudstorage.com';
const PREFIX = 'question-bank/v1/';

function createS3Client() {
  const { S3Client } = require('@aws-sdk/client-s3');
  return new S3Client({
    region: 'kr-standard',
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.NCP_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.NCP_SECRET_ACCESS_KEY ?? '',
    },
    forcePathStyle: true,
  });
}

async function listKeys(client: any): Promise<string[]> {
  const { ListObjectsCommand } = require('@aws-sdk/client-s3');
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsCommand({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Key.endsWith('.json')) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return keys.sort();
}

async function getObject(client: any, key: string): Promise<string> {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body.transformToString('utf-8');
}

function mapCategory(val: string): 'OS' | 'NETWORK' | 'DB' | 'DATA_STRUCTURE' | null {
  const v = (val || '').toUpperCase();
  if (['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'].includes(v)) return v as any;
  return null;
}

function mapDifficulty(val: string): 'EASY' | 'MEDIUM' | 'HARD' | null {
  if (!val) return null;
  const v = val.trim().toUpperCase();
  if (v === 'EASY') return 'EASY';
  if (v === 'MEDIUM') return 'MEDIUM';
  if (v === 'HARD') return 'HARD';
  return null;
}

async function main() {
  const client = createS3Client();
  const prisma = new PrismaService();
  await prisma.$connect?.();

  const keys = await listKeys(client);
  console.log(`Found ${keys.length} files in ${PREFIX}`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const key of keys) {
    console.log(`Importing ${key} ...`);
    const body = await getObject(client, key);
    const items: any[] = JSON.parse(body);

    for (const j of items) {
      try {
        const category = mapCategory(j.category);
        const difficulty = mapDifficulty(j.difficulty);
        const content = j.content as string;
        const contentHash =
          j.contentHash || createHash('sha256').update(content, 'utf-8').digest('hex');
        const term = j.term as string;
        const chapter = j.chapter as number;
        const conceptLevel = j.conceptLevel as number;
        const depth = j.depth as number;
        const mustInclude = Array.isArray(j.keywords) ? j.keywords : [];
        const topicId = `${category}-${chapter}-${term}`;

        if (!category || !difficulty || !content || !term) {
          failed++;
          continue;
        }

        const unique = { category, difficulty, topicId, contentHash };

        const res = await (prisma as any).question.upsert({
          where: { category_difficulty_topicId_contentHash: unique },
          create: {
            ...unique,
            content,
            mustInclude,
            timeLimitSec: 180,
            chapter,
            term,
            conceptLevel,
            depth,
          },
          update: { content, mustInclude, chapter, term, conceptLevel, depth },
        });

        if (res?.createdAt?.getTime() === res?.updatedAt?.getTime()) inserted++;
        else updated++;
      } catch (e) {
        failed++;
        console.warn('upsert failed:', (e as any)?.message);
      }
    }
  }

  console.log(`Done: inserted=${inserted} updated=${updated} failed=${failed}`);
  await prisma.$disconnect?.();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
