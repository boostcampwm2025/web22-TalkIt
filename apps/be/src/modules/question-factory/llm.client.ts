import { TopicSeed } from './types';

export interface LlmClient {
  // Real LLMs may return plain text; mock can return an array already.
  generateBlueprintBatch(prompt: string, seed: TopicSeed, nPerCell: number): Promise<unknown>;
}
