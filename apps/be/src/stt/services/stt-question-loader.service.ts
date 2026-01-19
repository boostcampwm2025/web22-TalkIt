import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

import { QuestionMeta } from '../types/question-meta.type';

@Injectable()
export class SttQuestionLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  async loadQuestionMeta(questionId: number): Promise<QuestionMeta> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        content: true,
        topicId: true,
        mustInclude: true,
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    return {
      questionId: question.id,
      content: question.content,
      topicId: question.topicId,
      mustInclude: question.mustInclude as string[],
    };
  }
}
