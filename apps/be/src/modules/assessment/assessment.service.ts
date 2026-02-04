import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserCreditsRepository } from '@/users/credits/user-credits.repository';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from './assessment.repository';
import type { AssessRequestDto } from './dto/assess-request.dto';
import type { AssessResponseDTO } from './dto/assess-response.dto';
import type { GetFeedbackResponseDTO } from './dto/get-feedback-response.dto';
import { AssessmentSnapshotHelper } from './utils/snapshot.helper';
import { ASSESS_EVAL_QUEUE } from './worker/assessment.tokens';
import { JobsOptions, Queue } from 'bullmq';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly userCreditsRepository: UserCreditsRepository,
    private readonly config: ConfigService,
    @Inject(ASSESS_EVAL_QUEUE) private readonly evalQueue: Queue,
  ) {}

  private readonly logger = new Logger(AssessmentService.name);

  /**
   * 답변을 저장하고 평가 작업을 생성/큐에 등록합니다.
   * - 소유자 검증: 세션이 존재하고 userId가 일치해야 합니다.
   * - 트랜잭션: 답변 생성과 평가 잡 생성은 원자적으로 처리됩니다.
   * - 큐 등록 실패 시 잡 상태를 FAILED로 갱신하고 503을 던집니다.
   */
  async submitAndAssess(
    userId: number,
    sessionId: number,
    body: AssessRequestDto,
  ): Promise<AssessResponseDTO> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '세션을 찾을 수 없습니다.',
      });
    }
    if (session.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '세션 소유자가 아닙니다.' });
    }

    // (트랜잭션 적용: 답변 + 작업 생성 원자화)
    const { answer, job } = await this.repo.createAnswerAndJob({
      userId,
      sessionId,
      questionId: body.questionId,
      extraQuestionId: body.extraQuestionId,
      answerText: body.answerText,
      timeSpentSec: body.timeSpentSec,
    });

    // 큐 등록: 멱등성을 위해 중복(jobId) 발생 시 성공으로 간주하고 로그만 남깁니다.
    try {
      const attempts = Number(this.config.get<string>('ASSESS_EVAL_ATTEMPTS') ?? '3');
      const backoff = Number(this.config.get<string>('ASSESS_EVAL_BACKOFF_MS') ?? '2000');
      // BullMQ custom jobId cannot include ':' → use hyphen
      const jobId = `answer-${answer.id}-evaluate`;
      const opts: JobsOptions = {
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
        attempts,
        backoff: { type: 'exponential', delay: backoff },
      };
      this.logger.log(
        `Enqueue evaluate requested: jobId=${jobId} answerId=${answer.id} attempts=${attempts} backoff=${backoff}ms`,
      );
      await this.evalQueue.add('evaluate', { answerId: answer.id }, opts);
      this.logger.log(`Enqueue evaluate success: jobId=${jobId} answerId=${answer.id}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const isDuplicate = /already exists/i.test(message ?? '');
      if (isDuplicate) {
        // 중복은 멱등 처리: 실패로 간주하지 않고 202 응답 흐름 유지
        this.logger.warn(
          `Enqueue skipped (duplicate jobId). Treating as success. error=${message}`,
        );
      } else {
        // 실제 실패는 DB 상태를 FAILED로 전파하고 503 반환
        await this.repo.updateAssessmentJob(job.id, {
          status: AssessmentStatus.FAILED,
          error: message,
          finishedAt: new Date(),
        });
        this.logger.error(`Enqueue evaluate failed: ${message}`);
        throw new ServiceUnavailableException({
          code: 'ASSESSMENT_ENQUEUE_FAILED',
          message: '평가 작업 큐 등록 실패',
          error: message,
        });
      }
    }

    return {
      jobId: job.id,
      answerId: answer.id,
      // Prisma Enum은 런타임에서 문자열이므로 그대로 반환합니다.
      status: AssessmentStatus.QUEUED,
    };
  }

  /**
   * 평가 결과 스냅샷을 조회합니다.
   * - 소유자 검증 및 잡 상태 확인(DONE만 성공).
   * - 내부 파싱 로직은 헬퍼(AssessmentSnapshotHelper)로 위임합니다.
   */
  async getSnapshot(userId: number, answerId: number): Promise<GetFeedbackResponseDTO> {
    const answer = await this.repo.getAnswerWithRelations(answerId);
    if (!answer)
      throw new NotFoundException({
        code: 'ANSWER_NOT_FOUND',
        message: '답변을 찾을 수 없습니다.',
      });
    if (answer.userId !== userId) {
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
        });
      }
      throw new ConflictException({
        code: 'ASSESSMENT_NOT_DONE',
        status: job.status,
      });
    }

    const { strengths, weaknesses, suggestions } = AssessmentSnapshotHelper.mapFeedbackJson(
      answer.feedbackJson,
    );
    const questionContent = AssessmentSnapshotHelper.extractQuestionContent(answer);
    const xp = AssessmentSnapshotHelper.computeXp(answer.session?.gainedXp ?? null);

    const remainingToken = await this.userCreditsRepository.getTotalCredit(userId);

    return {
      answerId: answer.id,
      question: questionContent,
      answer: answer.answerText,
      overallScore: Number(answer.overallScore ?? 0),
      strengths,
      weaknesses,
      suggestions,
      xp,
      remainingToken: remainingToken,
    };
  }
}
