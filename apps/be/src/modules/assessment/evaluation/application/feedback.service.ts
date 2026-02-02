import { Injectable } from '@nestjs/common';

import { StructuredNormalizerService } from '@/infra/structured/structured-normalizer.service';

import { AssessmentRepository } from '../../assessment.repository';
import { LlmFeedbackProvider } from '../infra/llm-feedback.provider';
import { extractQuestionContext } from './question-context.util';

/**
 * FeedbackService
 * - 기존 Orchestrator의 buildFeedback() 로직을 전담
 * - Golden 기반 LLM 피드백 생성 + 답변 원문에서 보수적으로 키워드 추출해 병합/저장
 */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly feedbackProvider: LlmFeedbackProvider,
    private readonly normalizer: StructuredNormalizerService,
  ) {}

  async buildFeedback(answerId: number) {
    // 1) 답변/문항 조회 및 검증
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');

    // 2) 질문 컨텍스트 추출
    const q = extractQuestionContext(answer);
    const questionSummary = q.content.slice(0, 200);

    // 3) 저장된 평가 결과를 읽어 피드백 생성
    const evaluation = (answer as any).evaluationJson ?? { issues: [], meta: {} };
    const feedback = await this.feedbackProvider.build({
      questionSummary,
      answerText: String(answer.answerText ?? ''),
      issues: evaluation,
    });

    // 4) Structured Outputs를 활용한 피드백 정규화
    const normalized = await this.normalizer.normalizeFeedback(JSON.stringify(feedback));

    // 5) 생성된 피드백을 DB에 저장
    await this.repo.setAnswerFeedback(answerId, normalized);

    // 6) 피드백 반환
    return { feedback: normalized };
  }
}
