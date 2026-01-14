import { QuestionModel } from '../../domain/models/question.model';
import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';

// DB 접근 포트: Prisma 등의 구현체가 이 인터페이스를 만족
export interface QuestionRepositoryPort {
  findById(id: bigint): Promise<QuestionModel | null>;
  findIdsByDomainDifficulty(domain: Domain, difficulty: Difficulty): Promise<bigint[]>;
}

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');
