import { Difficulty, Domain } from '@/common/enums/learning.enum';

import { QuestionModel } from '../../domain/models/question.model';

// DB 접근 포트: Prisma 등의 구현체가 이 인터페이스를 만족
export interface QuestionRepositoryPort {
  findById(id: number): Promise<QuestionModel | null>;
  findIdsByDomainDifficulty(domain: Domain, difficulty: Difficulty): Promise<number[]>;
}

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');
