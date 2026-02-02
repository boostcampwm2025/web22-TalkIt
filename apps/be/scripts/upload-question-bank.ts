/*
 * question-bank final JSON을 NCloud Object Storage에 업로드하는 스크립트
 * 사용법:
 *  단일 파일:  ts-node scripts/upload-question-bank.ts -path ./resource/question-bank/final/OS-1-20260203-final.json
 *  디렉토리:   ts-node scripts/upload-question-bank.ts -dir ./resource/question-bank/final
 */
import { ObjectStorageProvider } from '../src/modules/question-provider/infra/object-storage/object-storage.provider.impl';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

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

async function uploadFile(provider: ObjectStorageProvider, filePath: string) {
  const buf = readFileSync(filePath);
  const fileName = basename(filePath);
  const key = `question-bank/final/${fileName}`;
  const out = await provider.upload(buf, key, 'application/json');
  console.log(`Uploaded: key=${out.key} size=${out.size ?? buf.length} etag=${out.etag ?? ''}`);
}

async function main() {
  const parsed = parseArgs();
  const filePath = typeof parsed['-path'] === 'string' ? parsed['-path'] : '';
  const dirPath = typeof parsed['-dir'] === 'string' ? parsed['-dir'] : '';

  if (!filePath && !dirPath) {
    console.error('Usage: ts-node scripts/upload-question-bank.ts -path <file> | -dir <directory>');
    process.exit(1);
  }

  const provider = new ObjectStorageProvider();

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
      await uploadFile(provider, f);
    }
    console.log(`Done: uploaded ${files.length} files`);
  } else {
    await uploadFile(provider, filePath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
