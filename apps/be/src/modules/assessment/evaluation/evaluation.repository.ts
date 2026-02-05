import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

import type { Rubric, RubricItem } from './dtos';

@Injectable()
export class EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionByAnswerId(answerId: number) {
    // answerId에 연결된 문항을 조회합니다.
    const answer = await this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      select: { question: true },
    });
    return answer?.question ?? null;
  }

  async getRubricByQuestionId(questionId: number): Promise<Rubric | null> {
    // questionId에 해당하는 루브릭 항목들을 조회하여 Rubric 형태로 반환합니다.
    const items = await this.prisma.questionRubricItem.findMany({
      where: { questionId },
      orderBy: { id: 'asc' },
    });
    if (!items.length) return null;

    const rubricItems = items.map((it) => {
      // keywordsText가 JSON인 경우 description만 사용, 아니면 평문 그대로 사용
      let description = it.keywordsText ?? '';
      try {
        const parsed = JSON.parse(String(it.keywordsText ?? '')) as Partial<{
          description: string;
        }>;
        if (parsed && typeof parsed === 'object' && parsed.description) {
          description = String(parsed.description);
        }
      } catch {
        // plain text로 간주하여 그대로 사용
      }
      const weight = Number(it.weight ?? 0.2);
      return { description, weight };
    });
    return { items: rubricItems, scale: '0-2' } as Rubric;
  }

  async saveRubric(questionId: number, rubricContent: string) {
    // questionId에 해당하는 루브릭을 항목 단위로 저장합니다.
    // rubricContent 는 JSON 문자열이어야 합니다.
    let rubric: Rubric;
    const hasProp = <K extends string>(obj: unknown, prop: K): obj is Record<K, unknown> =>
      typeof obj === 'object' && obj !== null && prop in obj;

    const isRubricItem = (v: unknown): v is RubricItem =>
      hasProp(v, 'description') &&
      typeof v.description === 'string' &&
      hasProp(v, 'weight') &&
      typeof v.weight === 'number';

    const isRubric = (v: unknown): v is Rubric =>
      hasProp(v, 'items') &&
      Array.isArray(v.items) &&
      v.items.every(isRubricItem) &&
      hasProp(v, 'scale') &&
      v.scale === '0-2';
    try {
      const parsed: unknown = JSON.parse(rubricContent);
      if (!isRubric(parsed)) {
        throw new Error('INVALID_RUBRIC_JSON');
      }
      rubric = parsed;
    } catch {
      throw new Error('INVALID_RUBRIC_JSON');
    }
    const items = Array.isArray(rubric?.items) ? rubric.items : [];

    await this.prisma.$transaction(async (tx) => {
      // 기존 항목 삭제 후 재삽입(간단/일관성)
      await tx.questionRubricItem.deleteMany({ where: { questionId } });
      if (!items.length) return;
      // 저장: description 문장을 keywordsText에 직접 보관(문장 단위 저장)
      for (const it of items) {
        await tx.questionRubricItem.create({
          data: {
            questionId,
            keywordsText: String(it.description ?? ''),
            weight: Number(it.weight ?? 0.2),
          },
        });
      }
    });
  }
}
export default EvaluationRepository;
