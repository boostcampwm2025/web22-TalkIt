import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

// TODO: 해당 레포는 session 디렉토리에 두지 않고,나중에 분리할 예정입니다. 아직 적절한 위치를 찾지 못했습니다.

@Injectable()
export class AnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithContext(answerId: number) {
    const answer = await this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        extraQuestion: true,
      },
    });

    if (!answer) return null;

    const category = answer.question?.category ?? answer.extraQuestion?.category;

    const difficulty = answer.question?.difficulty ?? answer.extraQuestion?.difficulty;

    if (!category || !difficulty) {
      throw new Error('ANSWER_CONTEXT_NOT_FOUND');
    }

    return {
      ...answer,
      category,
      difficulty,
    };
  }
}
