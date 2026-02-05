import type { JsonSchemaSubset } from '@/infra/clova/schemas/request-body.schema';

export const evaluationIssuesSchema = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['strength', 'missing', 'unclear'] },
          detail: { type: 'string' },
          evidence: { type: 'string' },
          target: { type: ['string', 'null'] },
          score: { type: 'number' },
        },
        required: ['type', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['issues'],
  additionalProperties: false,
} as const satisfies JsonSchemaSubset;

export const feedbackSchema = {
  type: 'object',
  properties: {
    accurate: { type: 'array', items: { type: 'string' } },
    weakness: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['accurate', 'weakness', 'suggestions'],
  additionalProperties: false,
} as const satisfies JsonSchemaSubset;

export const goldenSchema = {
  type: 'object',
  properties: {
    golden_answer: { type: 'string' },
    key_points: { type: 'array', items: { type: 'string' } },
  },
  required: ['golden_answer', 'key_points'],
  additionalProperties: false,
} as const satisfies JsonSchemaSubset;

export const combinedEvaluationSchema = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['strength', 'missing', 'unclear'] },
          detail: { type: 'string' },
          evidence: { type: 'string' },
          target: { type: 'string' },
          score: { type: 'number' },
        },
        required: ['type', 'detail', 'evidence', 'target'],
        additionalProperties: false,
      },
    },
    feedback: {
      type: 'object',
      properties: {
        accurate: { type: 'array', items: { type: 'string' } },
        weakness: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['accurate', 'weakness', 'suggestions'],
      additionalProperties: false,
    },
  },
  required: ['issues', 'feedback'],
  additionalProperties: false,
} as const satisfies JsonSchemaSubset;

export const rubricSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          weight: { type: 'number' },
        },
        required: ['description', 'weight'],
        additionalProperties: false,
      },
    },
    scale: { type: 'string', enum: ['0-2'] },
  },
  required: ['items', 'scale'],
  additionalProperties: false,
} as const satisfies JsonSchemaSubset;
