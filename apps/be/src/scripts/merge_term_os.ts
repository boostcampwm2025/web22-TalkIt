import { Deduplicator } from '../modules/question-factory/deduplicator';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

type Domain = 'OS' | 'Network' | 'DB' | 'Data_Structure';

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function isBlueprintLike(obj: any): obj is {
  domain: Domain;
  topic_id: string;
  concept_level: string;
  question_depth: string;
  prompt: string;
  intent: string;
  must_include: string[];
} {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.domain === 'string' &&
    typeof obj.topic_id === 'string' &&
    typeof obj.concept_level === 'string' &&
    typeof obj.question_depth === 'string' &&
    typeof obj.prompt === 'string' &&
    typeof obj.intent === 'string' &&
    Array.isArray(obj.must_include)
  );
}

async function main() {
  const version = process.env.QF_VERSION || 'v2';
  const domain = (process.env.QF_MERGE_DOMAIN || 'OS') as Domain;
  const baseDir = path.resolve(process.cwd(), 'output', 'question-bank', version);
  const termDir = path.join(baseDir, 'term');
  const outPath =
    process.env.QF_MERGE_OUT || path.join(baseDir, `${domain.toLowerCase()}_terms_questions.jsonl`);

  if (!fs.existsSync(termDir)) {
    console.error('[merge] term directory not found:', termDir);
    process.exit(2);
  }

  const files = fs
    .readdirSync(termDir)
    .filter((f) => f.startsWith(`${domain}__term__`) && f.endsWith('.jsonl'))
    .map((f) => path.join(termDir, f));

  if (files.length === 0) {
    console.error('[merge] no term JSONL files for domain:', domain);
    process.exit(3);
  }

  const dedup = new Deduplicator();
  const merged: any[] = [];

  for (const file of files) {
    const txt = fs.readFileSync(file, 'utf8');
    const lines = txt.split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      try {
        const obj = JSON.parse(l);
        if (!isBlueprintLike(obj)) continue;
        if (!dedup.isDuplicate(obj as any)) merged.push(obj);
      } catch {
        // skip broken line
      }
    }
  }

  ensureDir(path.dirname(outPath));
  const fd = fs.openSync(outPath, 'w');
  try {
    for (const it of merged) fs.writeSync(fd, JSON.stringify(it) + '\n');
  } finally {
    fs.closeSync(fd);
  }

  console.log('[merge] done:', outPath, 'items=', merged.length, 'files=', files.length);
}

main().catch((e) => {
  console.error('merge_term_os failed:', e);
  process.exit(1);
});
