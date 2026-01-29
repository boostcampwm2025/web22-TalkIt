import { Injectable } from '@nestjs/common';

import { AssessmentRepository } from '../../assessment.repository';
import { ScoringService } from '../domain/scoring.service';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
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
    const rubric = await this.rubricService.create({ questionId, questionSummary });

    // 5) LLM 평가 호출: 사용자의 답변에 대한 루브릭 기반 평가 수행
    const evaluation = await this.evalProvider.evaluate({
      questionSummary,
      rubric,
      answerText: String(answer.answerText ?? ''),
    });

    // 6) 루브릭 기반 최종 점수 산출
    const score = this.scoring.computeRubricScore(evaluation, rubric);

    // 7) 산출된 평가 결과/점수 영속화
    await this.repo.setAnswerEvaluation(answerId, evaluation as any);
    await this.repo.setAnswerScore(answerId, score);

    // 8) 평가 결과 반환
    return { evaluation, score };
  }
}
