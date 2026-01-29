import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '../../infra/clova/clova.service';
import { PromptBuilder } from './prompt.builder';
import { GenerationOptions } from './types';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class QuestionFactoryService {
  private readonly logger = new Logger(QuestionFactoryService.name);

  constructor(
    private readonly clova: ClovaService,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(options: GenerationOptions): Promise<{ outputPath: string; data: unknown[] }> {
    const { domain, conceptLevel, questionDepth, count, term } = options;

    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(
      domain,
      conceptLevel,
      questionDepth,
      count,
      term,
    );

    this.logger.log(
      `LLM 호출 시작: domain=${domain} level=${conceptLevel} depth=${questionDepth} count=${count}`,
    );

    const response = await this.clova.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxCompletionTokens: 1500, temperature: 0.2 },
    );

    const data = this.extractJsonArray(response.content ?? '');

    this.logger.log(`LLM 응답 파싱 완료: ${data.length}개 항목`);

    const outputPath = await this.saveToFile(domain, data);

    this.logger.log(`파일 저장 완료: ${outputPath}`);

    return { outputPath, data };
  }

  private extractJsonArray(text: string): unknown[] {
    const cleaned = text
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {}

    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }

    throw new Error('LLM 응답에서 JSON 배열을 추출할 수 없습니다.');
  }

  private async saveToFile(domain: string, data: unknown[]): Promise<string> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datetime = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      '-',
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');

    const filename = `${domain}-${datetime}.json`;
    const dir = path.join(process.cwd(), 'output', 'question-bank');
    const filePath = path.join(dir, filename);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return filePath;
  }
}
