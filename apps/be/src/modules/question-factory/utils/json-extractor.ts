export function extractJsonArray(input: string): unknown[] {
  // Fast path: try direct parse
  try {
    const direct = JSON.parse(input) as unknown;
    if (Array.isArray(direct)) return direct as unknown[];
  } catch {
    // ignore
  }

  // Remove code fences if present
  const noFences = input.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''));

  // Heuristic: find first '[' and matching closing ']' by bracket counting
  const s = noFences;
  const start = s.indexOf('[');
  if (start === -1) throw new Error('no_json_array_found');
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        const slice = s.slice(start, i + 1);
        try {
          const parsed = JSON.parse(slice) as unknown;
          if (Array.isArray(parsed)) return parsed as unknown[];
        } catch {
          // ignore and continue scanning
        }
      }
    }
  }
  throw new Error('json_array_parse_failed');
}
