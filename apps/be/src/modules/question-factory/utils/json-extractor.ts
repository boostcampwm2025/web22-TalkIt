export function extractJsonArray(input: string): unknown[] {
  // 1) Fast path: try direct parse as array
  try {
    const direct = JSON.parse(input) as unknown;
    if (Array.isArray(direct)) return direct as unknown[];
  } catch {
    // ignore
  }

  // 2) Remove code fences if present, keep inner text
  const withoutFences = input.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''));

  // 3) Scan all bracketed array candidates and pick the largest valid array
  const s = withoutFences;
  const results: unknown[][] = [];
  for (let start = 0; start < s.length; start++) {
    if (s[start] !== '[') continue;
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
            if (Array.isArray(parsed)) results.push(parsed as unknown[]);
          } catch {
            // ignore and keep scanning further
          }
          break; // move start forward to find next array
        }
      }
    }
  }
  if (results.length > 0) {
    // Choose the largest array by length
    results.sort((a, b) => b.length - a.length);
    const best = results[0] as unknown[] | undefined;
    if (best) return best;
  }
  throw new Error('json_array_parse_failed');
}
