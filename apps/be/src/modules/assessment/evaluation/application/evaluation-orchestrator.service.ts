import { Injectable } from '@nestjs/common';

import { EvaluateService } from './evaluate.service';
import { FeedbackService } from './feedback.service';

/**
 * EvaluationOrchestratorService
 * - 평가/피드백 기능을 전담 서비스(EvaluateService, FeedbackService)에 위임하는 오케스트레이터
 * - 외부에서는 기존 인터페이스를 유지하며 내부 구현을 분리
 */
@Injectable()
export class EvaluationOrchestratorService {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly feedbackService: FeedbackService,
  ) {}

  /** 평가(스코어 산출)를 EvaluateService로 위임 */
  async evaluate(answerId: number): Promise<{ score: number }> {
    return this.evaluateService.evaluate(answerId);
  }

  /** 피드백 생성을 FeedbackService로 위임 */
  async buildFeedback(answerId: number): Promise<{ feedback: any }> {
    return this.feedbackService.buildFeedback(answerId);
  }
}
