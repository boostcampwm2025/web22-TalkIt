import { Blueprint, ConceptLevel, Domain, QuestionDepth } from './types';

const DOMAINS: Domain[] = ['OS', 'Network', 'DB', 'Data_Structure'];
const LEVELS: ConceptLevel[] = ['Basic', 'Intermediate', 'Advanced'];
const DEPTHS: QuestionDepth[] = ['Low', 'Mid', 'High'];

export function isDomain(v: any): v is Domain {
  return typeof v === 'string' && (DOMAINS as string[]).includes(v);
}
export function isConceptLevel(v: any): v is ConceptLevel {
  return typeof v === 'string' && (LEVELS as string[]).includes(v);
}
export function isQuestionDepth(v: any): v is QuestionDepth {
  return typeof v === 'string' && (DEPTHS as string[]).includes(v);
}

export function parseBlueprint(obj: unknown): Blueprint | null {
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  const domain = rec['domain'];
  const topic_id = rec['topic_id'];
  const concept_level = rec['concept_level'];
  const question_depth = rec['question_depth'];
  const prompt = rec['prompt'];
  const intent = rec['intent'];
  const must_include = rec['must_include'];
  const common_mistakes = rec['common_mistakes'];

  if (!isDomain(domain)) return null;
  if (typeof topic_id !== 'string') return null;
  if (!isConceptLevel(concept_level)) return null;
  if (!isQuestionDepth(question_depth)) return null;
  if (typeof prompt !== 'string') return null;
  if (typeof intent !== 'string') return null;
  if (!Array.isArray(must_include) || !must_include.every((s) => typeof s === 'string'))
    return null;
  if (!Array.isArray(common_mistakes) || !common_mistakes.every((s) => typeof s === 'string'))
    return null;

  return {
    domain,
    topic_id,
    concept_level,
    question_depth,
    prompt,
    intent,
    must_include,
    common_mistakes,
  };
}
