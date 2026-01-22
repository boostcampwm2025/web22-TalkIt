import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

import { QuestionMeta } from '../types/question-meta.type';

@Injectable()
export class SttQuestionLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  async loadQuestionMeta(params: {
    questionId?: number;
    extraQuestionId?: number;
  }): Promise<QuestionMeta> {
    // 계약 방어
    if (
      (!params.questionId && !params.extraQuestionId) ||
      (params.questionId && params.extraQuestionId)
    ) {
      throw new Error('INVALID_QUESTION_TARGET');
    }

    // =========================
    // 기본 Question
    // =========================
    if (params.questionId) {
      const question = await this.prisma.question.findUnique({
        where: { id: params.questionId },
        select: {
          id: true,
          content: true,
          topicId: true,
          mustInclude: true,
        },
      });

      if (!question) {
        throw new Error('QUESTION_NOT_FOUND');
      }

      return {
        questionId: question.id,
        content: question.content,
        topicId: question.topicId,
        mustInclude: question.mustInclude as string[],
      };
    }

    // =========================
    // ExtraQuestion (follow-up)
    // =========================
    const extraQuestion = await this.prisma.extraQuestion.findUnique({
      where: { id: params.extraQuestionId },
      select: {
        id: true,
        content: true,
        mustInclude: true,
      },
    });

    if (!extraQuestion) {
      throw new Error('EXTRA_QUESTION_NOT_FOUND');
    }

    return {
      questionId: extraQuestion.id, // 기존 필드 재사용 (중요)
      content: extraQuestion.content,
      topicId: '', // ExtraQuestion에는 topicId 없음
      mustInclude: extraQuestion.mustInclude as string[],
    };
  }
}
