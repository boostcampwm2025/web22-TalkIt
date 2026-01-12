import type { Blueprint, ConceptLevel, Domain, QuestionDepth } from './types';
import { z } from 'zod';

export const DomainZ = z.enum(['OS', 'Network', 'DB', 'Data_Structure'] as [Domain, ...Domain[]]);
export const ConceptLevelZ = z.enum(['Basic', 'Intermediate', 'Advanced'] as [
  ConceptLevel,
  ...ConceptLevel[],
]);
export const QuestionDepthZ = z.enum(['Low', 'Mid', 'High'] as [QuestionDepth, ...QuestionDepth[]]);

export const BlueprintZ = z.object({
  domain: DomainZ,
  topic_id: z.string(),
  concept_level: ConceptLevelZ,
  question_depth: QuestionDepthZ,
  prompt: z.string(),
  intent: z.string(),
  must_include: z.array(z.string()),
  common_mistakes: z.array(z.string()),
});

export function parseBlueprint(obj: unknown): Blueprint | null {
  const parsed = BlueprintZ.safeParse(obj);
  return parsed.success ? (parsed.data as Blueprint) : null;
}
