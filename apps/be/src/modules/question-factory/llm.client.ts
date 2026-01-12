import { Blueprint, TopicSeed } from './types';

export interface LlmClient {
  generateBlueprintBatch(prompt: string, seed: TopicSeed, nPerCell: number): Promise<Blueprint[]>;
}
