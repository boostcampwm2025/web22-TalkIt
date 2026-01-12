import { Blueprint } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class Exporter {
  writeJsonl(version: string, domain: string, topicId: string, items: Blueprint[]): string {
    const outDir = path.resolve(process.cwd(), 'output', 'question-bank', version);
    fs.mkdirSync(outDir, { recursive: true });
    const fileName = `${domain}__${topicId}.jsonl`;
    const outPath = path.join(outDir, fileName);
    const fd = fs.openSync(outPath, 'w');
    try {
      for (const it of items) {
        fs.writeSync(fd, JSON.stringify(it, null, 0) + '\n');
      }
    } finally {
      fs.closeSync(fd);
    }
    return outPath;
  }
}
