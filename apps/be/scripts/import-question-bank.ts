/*
 * question-bank final JSON을 DB로 import하는 스크립트
 * 사용법:
 *  로컬 파일:    ts-node scripts/import-question-bank.ts -source local -path ./resource/question-bank/final/OS-1-*.json
 *  로컬 디렉토리: ts-node scripts/import-question-bank.ts -source local -dir ./resource/question-bank/final
 *  오브젝트 스토리지: ts-node scripts/import-question-bank.ts -source object [-key question-bank/final/OS-1-final.json]
 */
import { PrismaService } from '../src/modules/question-provider/infra/prisma/prisma.service';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface FinalQuestion {
  category: string;
  chapter: number;
  term: string;
  difficulty: number;
  depth: number;
  totalDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  keywords: string[];
  content: string;
  contentHash: string;
}

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

function buildTopicId(category: string, chapter: number, term: string): string {
  const sanitized = term
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${category.toLowerCase()}-${chapter}-${sanitized}`;
}

async function importQuestions(prisma: any, questions: FinalQuestion[]) {
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const q of questions) {
    try {
      const topicId = buildTopicId(q.category, q.chapter, q.term);
      const unique = {
        category: q.category as any,
        difficulty: q.totalDifficulty as any,
        topicId,
        contentHash: q.contentHash,
      };

      const res = await prisma.question.upsert({
        where: { category_difficulty_topicId_contentHash: unique },
        create: {
          ...unique,
          content: q.content,
          mustInclude: q.keywords,
          timeLimitSec: 180,
          chapter: q.chapter,
          term: q.term,
          conceptLevel: q.difficulty,
          depth: q.depth,
        },
        update: {
          content: q.content,
          mustInclude: q.keywords,
          chapter: q.chapter,
          term: q.term,
          conceptLevel: q.difficulty,
          depth: q.depth,
        },
      });

      if (res?.createdAt === res?.updatedAt || !res?.updatedAt) inserted++;
      else updated++;
    } catch (e) {
      failed++;
      console.warn('upsert failed:', (e as any)?.message);
    }
  }

  return { inserted, updated, failed };
}

async function loadFromObjectStorage(key?: string): Promise<FinalQuestion[]> {
  const bucket = process.env.OBJECT_STORAGE_BUCKET_NAME ?? '';
  const endpoint = process.env.NCLOUD_OBJECT_ENDPOINT ?? 'https://kr.object.ncloudstorage.com';

  const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'kr-standard',
    endpoint,
    credentials: {
      accessKeyId: process.env.NCP_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.NCP_SECRET_ACCESS_KEY ?? '',
    },
    forcePathStyle: true,
  });

  const allQuestions: FinalQuestion[] = [];

  if (key) {
    // 단일 파일
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await out.Body.transformToString('utf-8');
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) allQuestions.push(...parsed);
  } else {
    // question-bank/final/ 하위 전체
    const prefix = 'question-bank/final/';
    const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const keys = (list.Contents ?? [])
      .map((obj: any) => obj.Key)
      .filter((k: string) => k.endsWith('-final.json'));

    for (const k of keys) {
      console.log('Downloading', k);
      const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: k }));
      const body = await out.Body.transformToString('utf-8');
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) allQuestions.push(...parsed);
    }
  }

  return allQuestions;
}

function loadFromLocal(filePath?: string, dirPath?: string): FinalQuestion[] {
  const allQuestions: FinalQuestion[] = [];

  if (dirPath) {
    const files = readdirSync(dirPath)
      .filter((f) => f.endsWith('-final.json'))
      .map((f) => join(dirPath, f))
      .sort();

    if (!files.length) {
      console.error('No final JSON files found in:', dirPath);
      process.exit(1);
    }

    for (const f of files) {
      console.log('Loading', f);
      const parsed = JSON.parse(readFileSync(f, 'utf-8'));
      if (Array.isArray(parsed)) allQuestions.push(...parsed);
    }
  } else if (filePath) {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (Array.isArray(parsed)) allQuestions.push(...parsed);
  }

  return allQuestions;
}

async function main() {
  const parsed = parseArgs();
  const source = typeof parsed['-source'] === 'string' ? parsed['-source'] : '';
  const filePath = typeof parsed['-path'] === 'string' ? parsed['-path'] : '';
  const dirPath = typeof parsed['-dir'] === 'string' ? parsed['-dir'] : '';
  const objectKey = typeof parsed['-key'] === 'string' ? parsed['-key'] : undefined;

  if (!source || !['local', 'object'].includes(source)) {
    console.error(
      'Usage:\n' +
        '  -source local  -path <file> | -dir <directory>\n' +
        '  -source object [-key <object-storage-key>]',
    );
    process.exit(1);
  }

  let questions: FinalQuestion[];
  if (source === 'object') {
    questions = await loadFromObjectStorage(objectKey);
  } else {
    if (!filePath && !dirPath) {
      console.error('local source requires -path or -dir');
      process.exit(1);
    }
    questions = loadFromLocal(filePath, dirPath);
  }

  console.log(`Loaded ${questions.length} questions, importing to DB...`);

  const prisma = new PrismaService();
  await prisma.$connect?.();

  const total = await importQuestions(prisma, questions);

  console.log(
    `imported: inserted=${total.inserted} updated=${total.updated} failed=${total.failed}`,
  );
  await prisma.$disconnect?.();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
