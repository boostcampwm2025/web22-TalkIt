/*
 * Object Storage 업로드 스크립트
 * 사용 예: ts-node scripts/upload-questionbank.ts -path ./resource/os_terms_questions.jsonl
 */
import { ObjectStorageProvider } from '../src/modules/question-provider/infra/object-storage/object-storage.provider.impl';
import { readFileSync } from 'node:fs';

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

async function main() {
  const parsed = parseArgs();
  const filePath = typeof parsed['-path'] === 'string' ? parsed['-path'] : '';
  if (!filePath) {
    console.error('Usage: ts-node scripts/upload-questionbank.ts -path <local_file>');
    process.exit(1);
  }
  const buf = readFileSync(filePath);
  const provider = new ObjectStorageProvider();
  const key = 'questionbank/os_terms_questions.jsonl';
  const out = await provider.upload(buf, key, 'application/jsonl');
  console.log(`Uploaded: key=${out.key} size=${out.size ?? buf.length} etag=${out.etag ?? ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
