import { Injectable } from '@nestjs/common';

import { EvaluateService } from './evaluate.service';
import { RubricService } from './rubric.service';

/**
 * EvaluationOrchestratorService
 * - 평가 기능을 전담 서비스(EvaluateService)에 위임하는 오케스트레이터
 * - 외부에서는 기존 인터페이스를 유지하며 내부 구현을 분리
 */
@Injectable()
export class EvaluationOrchestratorService {
  constructor(
    private readonly rubricService: RubricService,
    private readonly evaluateService: EvaluateService,
  ) {}

  /**
   * 루브릭 생성은 RubricService로 위임
   */
  async createRubric(questionId: number, question: string): Promise<any> {
    return this.rubricService.create({ questionId, question });
  }

  /**
   * 평가(스코어 산출) 및 피드백 생성을 EvaluateService로 위임
   */
  async evaluate(answerId: number): Promise<{ score: number }> {
    return this.evaluateService.evaluate(answerId);
  }
}
