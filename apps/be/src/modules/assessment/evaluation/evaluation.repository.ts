import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';

@Injectable()
export class EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionById(questionId: number) {
    // questionId에 해당하는 문항을 조회합니다.
    return this.prisma.question.findUnique({ where: { id: questionId } });
  }

  async getRubricByQuestionId(questionId: number) {
    // questionId에 해당하는 루브릭 항목들을 조회하여 Rubric 형태로 반환합니다.
    const items = await this.prisma.questionRubricItem.findMany({
      where: { questionId },
      orderBy: { id: 'asc' },
    });
    if (!items.length) return null;

    const rubricItems = items.map((it, idx) => {
      // keywordsText 에 JSON( { key, description } ) 형태로 저장된 경우 파싱
      let key = `item_${idx + 1}`;
      let description = it.keywordsText ?? '';
      try {
        const parsed = JSON.parse(it.keywordsText as any);
        if (parsed && typeof parsed === 'object') {
          if (parsed.key) key = String(parsed.key);
          if (parsed.description) description = String(parsed.description);
        }
      } catch {
        // 무시: 과거 포맷(plain text) 호환
      }
      const weight = Number(it.weight ?? 0.2);
      return { key, description, weight };
    });
    return { items: rubricItems, scale: '0-2' as const };
  }

  async saveRubric(questionId: number, rubricContent: string) {
    // questionId에 해당하는 루브릭을 항목 단위로 저장합니다.
    // rubricContent 는 JSON 문자열이어야 합니다.
    let rubric: { items: { key: string; description: string; weight: number }[] };
    try {
      rubric = JSON.parse(rubricContent);
    } catch {
      throw new Error('INVALID_RUBRIC_JSON');
    }
    const items = Array.isArray(rubric?.items) ? rubric.items : [];

    await this.prisma.$transaction(async (tx) => {
      // 기존 항목 삭제 후 재삽입(간단/일관성)
      await tx.questionRubricItem.deleteMany({ where: { questionId } });
      if (!items.length) return;
      // 저장: key/description은 keywordsText에 JSON으로 보관
      for (const it of items) {
        await tx.questionRubricItem.create({
          data: {
            questionId,
            keywordsText: JSON.stringify({
              key: String(it.key),
              description: String(it.description),
            }),
            weight: Number(it.weight ?? 0.2),
          },
        });
      }
    });
  }
}
export default EvaluationRepository;
