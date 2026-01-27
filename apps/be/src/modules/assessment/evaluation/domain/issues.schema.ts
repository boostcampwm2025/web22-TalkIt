import { z } from 'zod';

export const IssueTypeSchema = z.enum([
  'strength',
  'misconception',
  'missing',
  'unclear',
  'wrong-example',
]);

export const IssueSchema = z.object({
  type: IssueTypeSchema,
  detail: z.string().min(1),
  evidence: z.string().optional().default(''),
  target: z.string().nullable().optional().default(null),
  score: z.number().optional(),
});

export type Issue = z.infer<typeof IssueSchema>;

export const IssuesMetaSchema = z.object({
  mustIncludeMatched: z.array(z.string()).default([]),
  mustIncludeMissing: z.array(z.string()).default([]),
  source: z.enum(['llm', 'fallback']).optional(),
  finalScore: z.number().optional(),
  scoreDeterministic: z.boolean().optional(),
  offTopic: z.boolean().optional(),
  reason: z.string().optional(),
});

export type IssuesMeta = z.infer<typeof IssuesMetaSchema>;

export const IssuesPayloadSchema = z.object({
  issues: z.array(IssueSchema).default([]),
  meta: IssuesMetaSchema.default({ mustIncludeMatched: [], mustIncludeMissing: [] }),
});

export type IssuesPayload = z.infer<typeof IssuesPayloadSchema>;
