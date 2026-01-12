import * as fs from 'fs';
import * as path from 'path';

function parseLine(line: string): [string, string] | null {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!m) return null;
  const key: string = m[1] ?? '';
  let value: string = m[2] ?? '';
  // strip comments unless inside quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    const hash = value.indexOf('#');
    if (hash >= 0) value = value.slice(0, hash).trim();
  }
  return [key, value] as [string, string];
}

export function loadDotEnv(file = '.env') {
  try {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) return;
    const content = fs.readFileSync(p, 'utf8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const kv = parseLine(line);
      if (!kv) continue;
      const [k, v] = kv;
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // ignore load errors
  }
}
