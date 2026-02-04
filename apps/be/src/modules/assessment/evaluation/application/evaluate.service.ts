import { Injectable } from '@nestjs/common';

import { StructuredNormalizerService } from '@/modules/assessment/evaluation/structured/structured-normalizer.service';

import { AssessmentRepository } from '../../assessment.repository';
import { EvaluationRepository } from '../evaluation.repository';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
import { extractQuestionContext } from '../utils/question-context.util';
import { ScoringService } from '../utils/scoring.service';

/**
 * EvaluateService
 * - 기존 Orchestrator의 evaluate() 로직을 전담
 * - 답변/문항 조회 → LLM 평가 → 이슈 정규화 → 스코어 산출/저장
 */
@Injectable()
export class EvaluateService {
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly evaluationRepo: EvaluationRepository,
    private readonly evalProvider: LlmEvaluationProvider,
    private readonly scoring: ScoringService,
    private readonly normalizer: StructuredNormalizerService,
  ) {}

  async evaluate(answerId: number): Promise<{ score: number }> {
    // 1) 답변/문항 조회 및 검증
    const answer = await this.assessmentRepo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');

    // 2) 질문 컨텍스트 추출(문항 내용/필수 포함 키워드)
    const question = extractQuestionContext(answer);
    const questionContent = question.content;
    const questionId = question.id;
    const questionSummary = questionContent.slice(0, 200);

    // 3) 문항에 대한 루브릭 조회
    const rubric = (await this.evaluationRepo.getRubricByQuestionId(questionId)) ?? {
      items: [],
      scale: '0-2' as const,
    };

    // 4) LLM 평가 호출: 사용자의 답변에 대한 루브릭 기반 평가 수행
    const combinedText = await this.evalProvider.evaluate({
      questionSummary,
      rubric,
      answerText: String(answer.answerText ?? ''),
    });

    // 정규화: 통합 스키마로 한 번만 호출
    const normalized = await this.normalizer.normalizeCombined(combinedText);

    // 6) 루브릭 기반 최종 점수 산출
    const score = this.scoring.computeRubricScore(normalized, rubric);

    // 7) 산출된 평가 결과/점수/피드백 영속화
    await this.assessmentRepo.setAnswerEvaluation(answerId, { issues: normalized.issues });
    await this.assessmentRepo.setAnswerFeedback(answerId, normalized.feedback);
    await this.assessmentRepo.setAnswerScore(answerId, score);

    // 8) 평가 결과 반환(외부 계약: score 중심)
    return { score };
  }
}
