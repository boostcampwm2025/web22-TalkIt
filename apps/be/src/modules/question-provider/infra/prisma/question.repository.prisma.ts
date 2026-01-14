import { Injectable } from '@nestjs/common';

import { QuestionModel } from '../../domain/models/question.model';
import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';
import { QuestionRepositoryPort } from '../ports/question.repository';
import { PrismaService } from './prisma.service';

// Prisma 구현체: 실제 스키마는 AGENT.md의 모델 규칙을 만족해야 함
@Injectable()
export class QuestionRepositoryPrisma implements QuestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: bigint): Promise<QuestionModel | null> {
    // Prisma schema에 맞춘 타입 캐스팅 필요 (@prisma/client 설치 후 조정)
    const row = await (this.prisma as any).question.findUnique({
      where: { id },
    });
    if (!row) return null;
    return {
      id: BigInt(row.id),
      domain: row.domain as Domain,
      difficulty: row.difficulty as Difficulty,
      topicId: row.topicId,
      content: row.content,
      mustInclude: row.mustInclude as string[],
      timeLimitSec: row.timeLimitSec,
      createdAt: row.createdAt,
    } satisfies QuestionModel;
  }

  async findIdsByDomainDifficulty(domain: Domain, difficulty: Difficulty): Promise<bigint[]> {
    const rows = await (this.prisma as any).question.findMany({
      where: { domain, difficulty },
      select: { id: true },
    });
    return rows.map((r: any) => BigInt(r.id));
  }
}
