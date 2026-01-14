import { Injectable } from '@nestjs/common';

import type { ConceptLevel, Domain, QuestionDepth } from './types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Exporter {
  private getOutDir(version: string): string {
    const outDir = path.resolve(process.cwd(), 'output', 'question-bank', version);
    fs.mkdirSync(outDir, { recursive: true });
    return outDir;
  }

  getOutPath(version: string, domain: string, topicId: string): string {
    const outDir = this.getOutDir(version);
    const fileName = `${domain}__${topicId}.jsonl`;
    return path.join(outDir, fileName);
  }

  getTermOutPath(version: string, domain: string, conceptLevel: string, term: string): string {
    const outDir = path.join(this.getOutDir(version), 'term');
    fs.mkdirSync(outDir, { recursive: true });
    const slug = this.slug(term);
    const fileName = `${domain}__term__${conceptLevel}__${slug}.jsonl`;
    return path.join(outDir, fileName);
  }

  writeJsonlToPath(outPath: string, items: any[], mode: 'overwrite' | 'append' | 'merge') {
    if (mode === 'append') {
      const fd = fs.openSync(outPath, 'a');
      try {
        for (const it of items) fs.writeSync(fd, JSON.stringify(it) + '\n');
      } finally {
        fs.closeSync(fd);
      }
      return outPath;
    }
    if (mode === 'merge' && fs.existsSync(outPath)) {
      const existing = fs
        .readFileSync(outPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null as any;
          }
        })
        .filter(Boolean);
      const merged = this.mergeUnique(existing, items);
      const fd = fs.openSync(outPath, 'w');
      try {
        for (const it of merged) fs.writeSync(fd, JSON.stringify(it) + '\n');
      } finally {
        fs.closeSync(fd);
      }
      return outPath;
    }
    const fd = fs.openSync(outPath, 'w');
    try {
      for (const it of items) fs.writeSync(fd, JSON.stringify(it) + '\n');
    } finally {
      fs.closeSync(fd);
    }
    return outPath;
  }

  writeJsonl(
    version: string,
    domain: string,
    topicId: string,
    items: any[],
    mode: 'overwrite' | 'append' | 'merge' = 'overwrite',
  ): string {
    const outPath = this.getOutPath(version, domain, topicId);
    if (mode === 'append') {
      const fd = fs.openSync(outPath, 'a');
      try {
        for (const it of items) fs.writeSync(fd, JSON.stringify(it) + '\n');
      } finally {
        fs.closeSync(fd);
      }
      return outPath;
    }
    if (mode === 'merge' && fs.existsSync(outPath)) {
      // Load existing + new, deduplicate, and overwrite
      const existing = fs
        .readFileSync(outPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null as any;
          }
        })
        .filter(Boolean);
      const merged = this.mergeUnique(existing, items);
      const fd = fs.openSync(outPath, 'w');
      try {
        for (const it of merged) fs.writeSync(fd, JSON.stringify(it) + '\n');
      } finally {
        fs.closeSync(fd);
      }
      return outPath;
    }
    // overwrite
    const fd = fs.openSync(outPath, 'w');
    try {
      for (const it of items) fs.writeSync(fd, JSON.stringify(it) + '\n');
    } finally {
      fs.closeSync(fd);
    }
    return outPath;
  }

  private mergeUnique(a: any[], b: any[]): any[] {
    // Simple dedup: reuse fingerprint key similar to Deduplicator (without near-dup)
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[\p{P}\p{S}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const fp = (bp: {
      domain: Domain;
      topic_id: string;
      concept_level: ConceptLevel;
      question_depth: QuestionDepth;
      must_include: string[];
    }) =>
      norm(
        `${bp.domain}|${bp.topic_id}|${bp.concept_level}|${bp.question_depth}|${[...bp.must_include]
          .map((x) => norm(x))
          .sort()
          .join(',')}`,
      );
    const seen = new Set<string>();
    const out: any[] = [];
    const push = (bp: any) => {
      const k = fp(bp);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(bp);
    };
    for (const x of a) push(x);
    for (const x of b) push(x);
    return out;
  }

  private slug(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s._-]+/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
