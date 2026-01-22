import { Injectable } from '@nestjs/common';

import { Category, Difficulty } from '@prisma/client';

import type { ExtraQuestionModel } from '../../domain/models/extra-question.model';
import type { ExtraQuestionRepositoryPort } from '../ports/extra-question.repository.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class ExtraQuestionRepositoryPrisma implements ExtraQuestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<ExtraQuestionModel | null> {
    const row = await this.prisma.extraQuestion.findUnique({
      where: { id },
    });

    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.sessionId,
      parentAnswerId: row.parentAnswerId,
      content: row.content,
      mustInclude: row.mustInclude as string[],
      createdAt: row.createdAt,
    };
  }

  async findByParentAnswerId(parentAnswerId: number): Promise<ExtraQuestionModel | null> {
    const row = await this.prisma.extraQuestion.findFirst({
      where: { parentAnswerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.sessionId,
      parentAnswerId: row.parentAnswerId,
      content: row.content,
      mustInclude: row.mustInclude as string[],
      createdAt: row.createdAt,
    };
  }

  async save(data: {
    sessionId: number;
    parentAnswerId: number;
    content: string;
    mustInclude: string[];

    category: Category;
    difficulty: Difficulty;
    timeLimitSec: number;
    depth: number;
  }): Promise<ExtraQuestionModel> {
    const row = await this.prisma.extraQuestion.create({
      data: {
        sessionId: data.sessionId,
        parentAnswerId: data.parentAnswerId,
        content: data.content,
        mustInclude: data.mustInclude,
        category: data.category,
        difficulty: data.difficulty,
        timeLimitSec: data.timeLimitSec,
        depth: data.depth,
      },
    });

    return {
      id: row.id,
      sessionId: row.sessionId,
      parentAnswerId: row.parentAnswerId,
      content: row.content,
      mustInclude: row.mustInclude as string[],
      createdAt: row.createdAt,
    };
  }
}
