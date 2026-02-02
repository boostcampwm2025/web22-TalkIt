import { Domain } from '../data';
import { DraftQuestion, FinalQuestion } from './question-bank.types';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCE_BASE = path.resolve(__dirname, '../../../../resource/question-bank');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${date}-${time}`;
}

function sanitizeTerm(term: string): string {
  return term.replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 50);
}

export function saveDraftQuestions(
  category: Domain,
  chapter: number,
  term: string,
  questions: DraftQuestion[],
): string {
  const dir = path.join(RESOURCE_BASE, 'draft');
  ensureDir(dir);

  const fileName = `${category}-${chapter}-${sanitizeTerm(term)}-${timestamp()}-draft.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
  return filePath;
}

export function saveFinalQuestions(
  category: Domain,
  chapter: number,
  questions: FinalQuestion[],
): string {
  const dir = path.join(RESOURCE_BASE, 'final');
  ensureDir(dir);

  const fileName = `${category}-${chapter}-${timestamp()}-final.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
  return filePath;
}

export function loadDraftFiles(category: Domain, chapter: number): DraftQuestion[] {
  const dir = path.join(RESOURCE_BASE, 'draft');
  if (!fs.existsSync(dir)) return [];

  const prefix = `${category}-${chapter}-`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('-draft.json'));

  const questions: DraftQuestion[] = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    if (Array.isArray(data)) {
      questions.push(...data);
    }
  }
  return questions;
}
