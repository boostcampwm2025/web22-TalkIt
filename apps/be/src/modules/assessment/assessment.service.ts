import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';
// 공유 타입 의존: FE/BE 일관 응답 스키마를 위해 shared DTO를 사용합니다.
import type { AssessResponseDTO, GetFeedbackResponseDTO } from '@repo/shared/types/learning';

import { AssessmentRepository } from './assessment.repository';
import { AssessmentWorker } from './worker/assessment.worker';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly worker: AssessmentWorker,
  ) {}

  async submitAndAssess(
    userId: number,
    sessionId: number,
    body: {
      questionId?: number;
      extraQuestionId?: number;
      answerText: string;
      timeSpentSec: number;
    },
  ): Promise<AssessResponseDTO> {
    // NOTE: 반환 타입을 shared의 AssessResponseDTO로 고정하여 API 계약을 명확히 합니다.
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }
    if (session.userId !== userId) {
      // 권한 오류는 403이 더 적절하므로 Forbidden을 사용합니다.
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    // (트랜잭션 적용: 답변 + 작업 생성 원자화
    const { answer, job } = await this.repo.createAnswerAndJob({
      userId,
      sessionId,
      questionId: body.questionId,
      extraQuestionId: body.extraQuestionId,
      answerText: body.answerText,
      timeSpentSec: body.timeSpentSec,
    });

    // 큐 등록 실패 시 상태 전파: DB를 FAILED로 업데이트 후 503(Service Unavailable) 반환
    try {
      await this.worker.enqueue(answer.id);
    } catch (e: any) {
      const message = e?.message ?? String(e);
      await this.repo.updateAssessmentJob(job.id, {
        status: AssessmentStatus.FAILED,
        error: message,
        finishedAt: new Date(),
      });
      throw new ServiceUnavailableException({
        code: 'ASSESSMENT_ENQUEUE_FAILED',
        message: '평가 작업 큐 등록 실패',
        error: message,
      } as any);
    }

    return {
      jobId: job.id,
      answerId: answer.id,
      // Prisma enum과 shared 리터럴 타입 간 호환을 위해 런타임 값은 동일하게 유지합니다.
      status: AssessmentStatus.QUEUED as any,
    };
  }

  // NOTE: 스냅샷 응답도 shared의 GetFeedbackResponseDTO로 고정
  async getSnapshot(userId: number, answerId: number): Promise<GetFeedbackResponseDTO> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer)
      throw new NotFoundException({
        code: 'ANSWER_NOT_FOUND',
        message: '답변을 찾을 수 없습니다.',
      });
    if (answer.userId !== userId) {
      // 답변 소유권 불일치 → 403
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '답변 소유자가 아닙니다.' });
    }
    const job = await this.repo.getAssessmentJobByAnswerId(answerId);
    if (!job) {
      throw new NotFoundException({
        code: 'ASSESSMENT_JOB_NOT_FOUND',
        message: '평가 작업을 찾을 수 없습니다.',
      });
    }
    if (job.status !== AssessmentStatus.DONE) {
      // 평가 실패계열은 422로 상세 상태/에러를 전달, 진행중은 409로 반환합니다.
      if (
        job.status === AssessmentStatus.FAILED ||
        job.status === AssessmentStatus.FAILED_EVALUATION ||
        job.status === AssessmentStatus.FAILED_FEEDBACK
      ) {
        throw new UnprocessableEntityException({
          code: 'ASSESSMENT_FAILED',
          status: job.status,
          error: job.error ?? null,
        } as any);
      }
      throw new ConflictException({
        code: 'ASSESSMENT_NOT_DONE',
        status: job.status,
      } as any);
    }

    // feedbackJson의 예상 구조를 좁혀 타입 안정성을 높입니다.
    // 주의: 저장되는 FeedbackJson 스키마(키 이름/구조)가 변경되면
    // 아래 strengths/suggestions 매핑(130~131라인)도 함께 수정해야 합니다.
    // 가능하면 shared 영역에 명세 타입을 두고(예: @repo/shared) 동일 타입을 참조하세요.
    type FeedbackJson = {
      accurate?: unknown;
      improvement?: unknown;
      keywords?: unknown;
    } | null;
    const feedback: FeedbackJson = (answer as any).feedbackJson ?? null;
    // 안전한 문자열 배열 변환 유틸: unknown → string[]
    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)) : [];

    // 현재 피드백은 accurate(강점), improvement(개선점) 배열을 가정합니다.
    // FeedbackJson 형식이 변경되면 이 부분의 키/매핑 로직을 함께 업데이트해야 합니다.
    const strengths = toStringArray(feedback?.accurate);
    const suggestions = toStringArray(feedback?.improvement);
    const questionContent = String(
      (answer as any).question?.content ?? (answer as any).extraQuestion?.content ?? '',
    );

    // xp 변환: 세션의 gainedXp(Json)를 정수 합산(base + diff + deep)으로 환산합니다.
    const gained = (answer as any).session?.gainedXp ?? null;
    const xp = (() => {
      try {
        if (!gained) return 0;
        const base = Number(gained.baseXp ?? 0);
        const diff = Number(gained.difficultyBonus ?? 0);
        const deep = Number(gained.deepDiveBonus ?? 0);
        const sum = base + (isNaN(diff) ? 0 : diff) + (isNaN(deep) ? 0 : deep);
        return isNaN(sum) ? 0 : sum;
      } catch {
        return 0;
      }
    })();

    return {
      // shared DTO 스키마에 맞춰 필드를 매핑합니다.
      answerId: answer.id,
      question: questionContent,
      answer: String((answer as any).answerText ?? ''),
      overallScore: Number((answer as any).overallScore ?? 0),
      strengths,
      weaknesses: [], // 현재 피드백 구조상 약점(weaknesses)은 분리 데이터가 없어 빈 배열 유지
      suggestions,
      xp,
      remainingToken: 0, // 토큰 잔여량 추적 미구현으로 0 반환
    };
  }
}
