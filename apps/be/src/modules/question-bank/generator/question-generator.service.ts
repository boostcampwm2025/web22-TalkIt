import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '../../../infra/clova/clova.service';
import { saveDraftQuestions } from '../common/file-manager';
import { DraftQuestion } from '../common/question-bank.types';
import { CONCEPT_LEVEL_MAP, CURRICULA, Domain } from '../data';
import { buildSystemPrompt, buildUserPrompt } from './question-generator.prompt';

interface GenerateInput {
  category: Domain;
  chapter: number;
  count?: number;
}

interface LlmQuestionItem {
  term: string;
  depth: number;
  keywords: string[];
  content: string;
}

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly topP: number;

  constructor(private readonly clova: ClovaService) {
    this.temperature = parseFloat(process.env.QB_LLM_TEMPERATURE ?? '0.7');
    this.maxTokens = parseInt(process.env.QB_LLM_MAX_TOKENS ?? '2048', 10);
    this.topP = parseFloat(process.env.QB_LLM_TOP_P ?? '0.8');
  }

  async generate(input: GenerateInput): Promise<{ files: string[]; total: number }> {
    const { category, chapter, count = 10 } = input;

    const curriculum = CURRICULA[category];
    const chapterData = curriculum.chapters.find((c) => c.chapter === chapter);
    if (!chapterData) {
      throw new Error(`Chapter ${chapter} not found in ${category} curriculum`);
    }

    const files: string[] = [];
    let total = 0;

    for (const concept of chapterData.keyConcepts) {
      this.logger.log(`Generating questions: ${category} ch${chapter} - ${concept.term}`);

      const questions = await this.generateForConcept({
        domain: category,
        chapter,
        chapterTitle: chapterData.title,
        term: concept.term,
        conceptLevel: concept.conceptLevel,
        count,
      });

      const filePath = saveDraftQuestions(category, chapter, concept.term, questions);
      files.push(filePath);
      total += questions.length;

      this.logger.log(`Saved ${questions.length} questions to ${filePath}`);
    }

    return { files, total };
  }

  private async generateForConcept(params: {
    domain: Domain;
    chapter: number;
    chapterTitle: string;
    term: string;
    conceptLevel: 'Basic' | 'Intermediate' | 'Advanced';
    count: number;
  }): Promise<DraftQuestion[]> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(params);

    const { content } = await this.clova.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        maxCompletionTokens: this.maxTokens,
        temperature: this.temperature,
      },
    );

    if (!content) {
      this.logger.error(`Empty response for ${params.term}`);
      return [];
    }

    return this.parseResponse(content, params);
  }

  private parseResponse(
    content: string,
    params: { domain: Domain; chapter: number; term: string; conceptLevel: string },
  ): DraftQuestion[] {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      this.logger.error(`No JSON array found in response for ${params.term}`);
      return [];
    }

    let items: LlmQuestionItem[];
    try {
      items = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.error(`JSON parse failed for ${params.term}`);
      return [];
    }

    if (!Array.isArray(items)) return [];

    const conceptLevelNum =
      CONCEPT_LEVEL_MAP[params.conceptLevel as keyof typeof CONCEPT_LEVEL_MAP];

    return items
      .filter((item) => item.content && item.depth >= 1 && item.depth <= 3)
      .map((item) => ({
        category: params.domain,
        chapter: params.chapter,
        term: item.term || params.term,
        difficulty: conceptLevelNum,
        depth: item.depth as 1 | 2 | 3,
        keywords: Array.isArray(item.keywords)
          ? item.keywords.filter((k) => typeof k === 'string')
          : [],
        content: item.content.trim(),
      }));
  }
}
