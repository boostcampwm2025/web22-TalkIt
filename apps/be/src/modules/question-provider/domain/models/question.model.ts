import { Difficulty, Domain } from '../../presentation/dto/pick-question.request.dto';

// 도메인 모델: 서비스/전략/레포 계층에서 공용으로 사용하는 질문 엔터티 모델
export interface QuestionModel {
  id: bigint;
  domain: Domain;
  difficulty: Difficulty;
  topicId: string;
  content: string;
  mustInclude: string[];
  timeLimitSec: number; // 고정 180초 저장 정책
  createdAt?: Date;
}
