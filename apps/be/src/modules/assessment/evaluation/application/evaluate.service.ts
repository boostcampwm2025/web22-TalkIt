import { Injectable } from '@nestjs/common';

import { AssessmentRepository } from '../../assessment.repository';
import { ScoringService } from '../domain/scoring.service';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
import { LlmGoldenProvider } from '../infra/llm-golden.provider';
import { extractQuestionContext } from './question-context.util';
import { RubricService } from './rubric.service';

/**
 * EvaluateService
 * - 기존 Orchestrator의 evaluate() 로직을 전담
 * - 답변/문항 조회 → LLM 평가 → 이슈 정규화 → 스코어 산출/저장
 */
@Injectable()
export class EvaluateService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly evalProvider: LlmEvaluationProvider,
    private readonly rubricService: RubricService,
    private readonly scoring: ScoringService,
    private readonly goldenProvider: LlmGoldenProvider,
  ) {}

  async evaluate(answerId: number): Promise<{ evaluation; score: number }> {
    // 1) 답변/문항 조회 및 검증
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');

    // 2) 질문 컨텍스트 추출(문항 내용/필수 포함 키워드)
    const q = extractQuestionContext(answer);

    // 3) LLM 프롬프트 길이 제어를 위한 질문 요약(앞 200자)
    const questionSummary = q.content.slice(0, 200);
    const questionId = q.id;

    // 4) Rubric 생성/조회 호출
    const rubric = await this.rubricService.create({
      questionId: q.isExtra ? undefined : questionId,
      extraQuestionId: q.isExtra ? questionId : undefined,
      questionSummary,
    });

    // 5) Golden은 캐시에 있으면 사용, 없으면 1회 생성
    //    (요청에 따라 기존 분리 호출 로직은 주석으로 유지)
    const cachedGolden = await this.goldenProvider.getCached(questionSummary);
    const golden = cachedGolden ?? (await this.goldenProvider.generate({ questionSummary }));

    // 6) 평가 + 피드백을 1회 호출로 생성
    //    기존 로직(평가 LLM 호출 후 피드백 별도 호출)은 주석 처리
    // const evaluation = await this.evalProvider.evaluate(...)
    const { issues, feedback } = await this.evalProvider.evaluateWithFeedback({
      questionSummary,
      rubric,
      answerText: String(answer.answerText ?? ''),
      goldenJson: JSON.stringify(golden),
    });

    const evaluation = { issues, meta: { source: 'llm' } } as any;

    // 7) 루브릭 기반 최종 점수 산출
    const score = this.scoring.computeRubricScore(evaluation, rubric);

    // 8) 산출된 평가/점수/피드백 저장
    await this.repo.setAnswerEvaluation(answerId, evaluation);
    await this.repo.setAnswerScore(answerId, score);
    await this.repo.setAnswerFeedback(answerId, feedback as any);

    // 9) 평가 결과 반환
    return { evaluation, score };
  }
}
