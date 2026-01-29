import { Controller, Param, ParseIntPipe, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';

import { AssessmentRepository } from '../assessment.repository';
import { AssessmentQueueEventBus } from '../worker/assessment.queue-events';
import { Observable } from 'rxjs';

type SseEvent = MessageEvent;

@ApiTags('Learning - Assessment')
@Controller('/api/learning')
export class AssessmentSseController {
  constructor(
    private readonly eventBus: AssessmentQueueEventBus,
    private readonly repo: AssessmentRepository,
  ) {}

  @Sse(':answerId/assess/stream')
  @ApiOperation({ summary: '평가 진행 상황 SSE 스트림 (BullMQ QueueEvents 기반)' })
  //@Sse(':sessionId/answers/:answerId/assess/stream')
  @UseGuards(JwtAuthGuard)
  //@ApiOperation({ summary: '평가 진행 상황 SSE 스트림' })
  @ApiParam({ name: 'answerId', type: Number })
  sse(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('answerId') answerIdParam: string,
  ): Observable<SseEvent> {
    const answerId = Number(answerIdParam);
    const queueJobId = `answer-${answerId}`; // BullMQ 큐에서 사용하는 문자열 ID
    const userId = user.id;

    return new Observable<SseEvent>((subscriber) => {
      let unsub: (() => void) | null = null;
      let heartbeatTimer: NodeJS.Timeout | null = null;
      let dbJobId: number | null = null; // 합의된 DTO의 jobId로 사용 (숫자)

      (async () => {
        // 1) 소유권 검사
        const session = await this.repo.findSessionById(sessionId);

        if (!session || session.userId !== userId) {
          subscriber.next({ data: { error: 'FORBIDDEN_SESSION' } } as any);
          subscriber.complete();
          return;
        }

        const answer = await this.repo.getAnswerWithRelations(answerId);
        if (!answer || answer.userId !== userId) {
          subscriber.next({ data: { error: 'FORBIDDEN' } } as any);
          subscriber.complete();
          return;
        }

        // 2) 현재 DB 상태 스냅샷 1회 전송 (재연결/유실 대비)
        const jobRow = await this.repo.getAssessmentJobByAnswerId(answerId);
        if (jobRow) {
          dbJobId = jobRow.id;
          // 합의된 DTO 형태로 송신: { jobId:number, answerId:number, status, timestamp, error }
          subscriber.next({
            data: {
              jobId: jobRow.id,
              answerId: answerId,
              status: jobRow.status,
              timestamp: new Date().toISOString(),
              error: jobRow.error ?? null,
            },
          } as any);
        }

        // 3) QueueEvents 스트림 구독
        const sub = this.eventBus.stream(queueJobId).subscribe({
          next: (evt) => {
            // progress 이벤트는 worker에서 합의된 DTO 형태로 내려오도록 구성되어 있음
            if ((evt as any).type === 'progress') {
              subscriber.next({ data: (evt as any).data } as any);
              return;
            }
            // completed/failed 이벤트는 보조적: 진행 중 progress에서 DONE/FAILED가 이미 전달됨
            // 혹시 progress 유실 시를 대비해 보정 DTO를 만들어 한 번 더 전달
            if ((evt as any).type === 'completed') {
              if (dbJobId != null) {
                subscriber.next({
                  data: {
                    jobId: dbJobId,
                    answerId,
                    status: 'DONE',
                    timestamp: new Date().toISOString(),
                    error: null,
                  },
                } as any);
              }
              return;
            }
            if ((evt as any).type === 'failed') {
              if (dbJobId != null) {
                subscriber.next({
                  data: {
                    jobId: dbJobId,
                    answerId,
                    status: 'FAILED',
                    timestamp: new Date().toISOString(),
                    error: (evt as any).error ?? 'failed',
                  },
                } as any);
              }
              return;
            }
          },
          error: () => subscriber.complete(),
          complete: () => subscriber.complete(),
        });

        unsub = () => sub.unsubscribe();

        // 4) heartbeat (프록시/로드밸런서에서 idle 끊김 방지)
        // 구독자가 이미 해제된 경우 setInterval 자체를 만들지 않음(테스트/런타임 누수 방지)
        if (!(subscriber as any).closed) {
          heartbeatTimer = setInterval(() => {
            if ((subscriber as any).closed) return;
            subscriber.next({
              // 하트비트는 클라이언트 keep-alive 용이며, 합의된 DTO 스키마와 별개로 전송
              data: { type: 'heartbeat', timestamp: new Date().toISOString() },
            } as any);
          }, 25_000);
          // 혹시 직후에 구독이 닫힌 경우 즉시 정리
          if ((subscriber as any).closed) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
        }
      })().catch(() => subscriber.complete());

      // cleanup
      return () => {
        if (unsub) unsub();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      };
    });
  }
}
