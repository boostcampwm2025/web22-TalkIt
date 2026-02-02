import { Injectable } from '@nestjs/common';

import { AssessmentRepository } from '../../assessment.repository';

/**
 * FeedbackService
 * - 기존 Orchestrator의 buildFeedback() 로직을 전담
 * - Golden 기반 LLM 피드백 생성 + 답변 원문에서 보수적으로 키워드 추출해 병합/저장
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly repo: AssessmentRepository) {}

  async buildFeedback(answerId: number) {
    // 1) 답변/문항 조회 및 검증
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer) throw new Error('ANSWER_NOT_FOUND');

    // 2) 이미 저장된 피드백이 있으면 그대로 반환
    const existing = (answer as any).feedbackJson ?? null;
    if (existing) {
      return { feedback: existing };
    }

    // 3) 기존 피드백 생성 로직은 주석 처리 (LLM 호출 축소)
    // const q = extractQuestionContext(answer);
    // const questionSummary = q.content.slice(0, 200);
    // const evaluation = (answer as any).evaluationJson ?? { issues: [], meta: {} };
    // const feedback = await this.feedbackProvider.build({
    //   questionSummary,
    //   answerText: String(answer.answerText ?? ''),
    //   issues: evaluation,
    // });
    // await this.repo.setAnswerFeedback(answerId, feedback);
    // return { feedback };

    // 4) 예외적으로 피드백이 없으면 간단한 폴백 생성
    //    (요청에 따라 LLM 호출은 하지 않음)
    const evaluation = (answer as any).evaluationJson ?? { issues: [], meta: {} };
    const feedback = this.fallbackFromIssues(evaluation?.issues ?? []);
    await this.repo.setAnswerFeedback(answerId, feedback as any);
    return { feedback };
  }

  private fallbackFromIssues(issues: any[]) {
    const accurate: string[] = [];
    const weakness: string[] = [];
    const suggestions: string[] = [];
    for (const i of issues ?? []) {
      const t = String(i?.type ?? '');
      const target = String(i?.target ?? '').trim();
      if (t === 'strength') {
        accurate.push(
          target ? `${target}을 정확하게 설명했어요.` : '핵심 개념을 정확하게 설명했어요.',
        );
      } else if (t === 'missing' || t === 'unclear' || t === 'misconception') {
        if (target) weakness.push(`${target}에 대한 설명을 보완해 주세요.`);
        if (target)
          suggestions.push(
            `‘${target}’의 핵심 정의를 한두 문장으로 정리하고 왜 중요한지 간단한 예시와 함께 보충해 보세요.`,
          );
      }
    }
    return {
      accurate: accurate.slice(0, 3),
      weakness: weakness.slice(0, 5),
      suggestions: suggestions.slice(0, 5),
    };
  }
}
