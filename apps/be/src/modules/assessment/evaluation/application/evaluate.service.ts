import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 정규화 로직 제거 버전: 정상 동작을 위해 직접 정규화 호출을 하지 않습니다.

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
  private readonly logger = new Logger(EvaluateService.name);
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly evaluationRepo: EvaluationRepository,
    private readonly evalProvider: LlmEvaluationProvider,
    private readonly scoring: ScoringService,
    private readonly config: ConfigService,
  ) {}

  async evaluate(answerId: number): Promise<{ score: number }> {
    this.logger.log(`Evaluate start: answerId=${answerId}`);
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
    this.logger.log(`Evaluate LLM done: answerId=${answerId} combinedLen=${combinedText.length}`);

    const normalized = JSON.parse(combinedText) as {
      issues: {
        type: 'strength' | 'missing' | 'unclear';
        detail: string;
        evidence?: string;
        target?: string;
        score?: number;
      }[];
      feedback: { accurate: string[]; weakness: string[]; suggestions: string[] };
    };
    this.logger.warn(`Evaluate normalization disabled: answerId=${answerId}`);

    // 6) 루브릭 기반 최종 점수 산출
    const score = this.scoring.computeRubricScore(normalized, rubric);
    this.logger.log(`Evaluate score computed: answerId=${answerId} score=${score}`);

    // 7) 산출된 평가 결과/점수/피드백 영속화
    await this.assessmentRepo.setAnswerEvaluation(answerId, { issues: normalized.issues });
    await this.assessmentRepo.setAnswerFeedback(answerId, normalized.feedback);
    await this.assessmentRepo.setAnswerScore(answerId, score);
    this.logger.log(`Evaluate persisted: answerId=${answerId}`);

    // 8) 평가 결과 반환(외부 계약: score 중심)
    return { score };
  }
}
