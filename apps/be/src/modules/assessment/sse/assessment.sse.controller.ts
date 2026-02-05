import { Controller, MessageEvent, Param, ParseIntPipe, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentRepository } from '../assessment.repository';
import type { AssessmentSseEventDTO } from '../dto/assessment-sse-event.dto';
import { AssessmentQueueEventBus } from '../redis/assessment.queue-events';
import type { AssessmentQueueEvent } from '../redis/queue-events.types';
import { Observable } from 'rxjs';

// SSE에서 사용하는 메시지 외피 타입
type SseEvent = MessageEvent;

@ApiTags('Learning - Assessment')
@Controller('/api/learning')
export class AssessmentSseController {
  constructor(
    private readonly eventBus: AssessmentQueueEventBus,
    private readonly repo: AssessmentRepository,
  ) {}

  /**
   * 평가 진행 상황 SSE 스트림
   * - QueueEvents(progress)를 구독하여 진행 상태를 푸시합니다.
   * - 최초 1회 DB 스냅샷 전송으로 재연결/유실 보정.
   */
  @ApiOperation({ summary: '평가 진행 상황 SSE 스트림 (BullMQ QueueEvents 기반)' })
  @Sse(':sessionId/answers/:answerId/assess/stream')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'sessionId', type: Number })
  @ApiParam({ name: 'answerId', type: Number })
  sse(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
  ): Observable<SseEvent> {
    const queueJobId = `answer-${answerId}`; // BullMQ 큐에서 사용하는 문자열 ID
    const userId = user.id;

    // payload를 Nest의 MessageEvent 형태로 감싸는 헬퍼
    const toEvent = <T extends string | object>(data: T): MessageEvent => ({ data });

    return new Observable<SseEvent>((subscriber) => {
      let unsub: (() => void) | null = null;
      let dbJobId: number | null = null; // DB 스냅샷 기반 보정 시 사용

      (async () => {
        // 1) 소유권 검사: 세션/답변이 본인 소유인지 확인
        const session = await this.repo.findSessionById(sessionId);

        if (!session || session.userId !== userId) {
          subscriber.next(toEvent({ error: 'FORBIDDEN_SESSION' as const }));
          subscriber.complete();
          return;
        }

        const answer = await this.repo.getAnswerWithRelations(answerId);
        if (!answer || answer.userId !== userId || answer.sessionId !== sessionId) {
          subscriber.next(toEvent({ error: 'FORBIDDEN' as const }));
          subscriber.complete();
          return;
        }

        // 2) 현재 DB 상태 스냅샷 1회 전송 (재연결/유실 대비)
        const jobRow = await this.repo.getAssessmentJobByAnswerId(answerId);
        if (jobRow) {
          dbJobId = jobRow.id;
          const snapshot: AssessmentSseEventDTO = {
            jobId: jobRow.id,
            answerId,
            status: jobRow.status,
            timestamp: new Date().toISOString(),
            error: jobRow.error ?? null,
          };
          subscriber.next(toEvent(snapshot));
        }

        // 3) QueueEvents 스트림 구독
        const sub = this.eventBus.stream(queueJobId).subscribe({
          next: (evt: AssessmentQueueEvent) => {
            // progress: worker에서 합의된 DTO 형태로 내려온 페이로드를 그대로 전달
            if (evt.type === 'progress') {
              const payload = evt.data;
              subscriber.next(toEvent(payload));
              return;
            }
            // progress 유실 보정: completed/failed 도착 시 최소 DTO 재전달
            if (evt.type === 'completed' && dbJobId != null) {
              const payload: AssessmentSseEventDTO = {
                jobId: dbJobId,
                answerId,
                status: AssessmentStatus.DONE,
                timestamp: new Date().toISOString(),
                error: null,
              };
              subscriber.next(toEvent(payload));
              return;
            }
            if (evt.type === 'failed' && dbJobId != null) {
              const payload: AssessmentSseEventDTO = {
                jobId: dbJobId,
                answerId,
                status: AssessmentStatus.FAILED,
                timestamp: new Date().toISOString(),
                error: evt.error ?? 'failed',
              };
              subscriber.next(toEvent(payload));
              return;
            }
          },
          error: () => subscriber.complete(),
          complete: () => subscriber.complete(),
        });

        unsub = () => sub.unsubscribe();
      })().catch(() => subscriber.complete());

      // cleanup
      return () => {
        if (unsub) unsub();
      };
    });
  }
}
