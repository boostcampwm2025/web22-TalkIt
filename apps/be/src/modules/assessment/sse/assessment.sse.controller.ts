import { Controller, Param, Sse } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AssessmentRepository } from '../assessment.repository';
import { AssessmentPubSub } from '../pubsub/assessment.pubsub';
import { Observable, Subject } from 'rxjs';

type SseEvent = MessageEvent;

@ApiTags('Learning - Assessment')
@Controller('/api/learning/answers')
export class AssessmentSseController {
  constructor(
    private readonly pubsub: AssessmentPubSub,
    private readonly repo: AssessmentRepository,
  ) {}

  @Sse(':answerId/assess/stream')
  @ApiOperation({ summary: '평가 진행 상황 SSE 스트림' })
  @ApiParam({ name: 'answerId', type: Number })
  sse(@Param('answerId') answerIdParam: string): Observable<SseEvent> {
    const answerId = Number(answerIdParam);
    const userId = 1; // TODO: JWT 연동 시 교체 및 소유권 검사

    return new Observable<SseEvent>((subscriber) => {
      let cleanup: (() => void) | null = null;
      (async () => {
        const answer = await this.repo.getAnswerWithRelations(answerId);
        if (!answer || answer.userId !== userId) {
          subscriber.next({ data: { error: 'FORBIDDEN' } } as any);
          subscriber.complete();
          return;
        }

        const job = await this.repo.getAssessmentJobByAnswerId(answerId);
        if (job) {
          subscriber.next({
            data: {
              jobId: job.id,
              answerId,
              status: job.status,
              timestamp: new Date().toISOString(),
              error: job.error ?? null,
            },
          } as any);
        }

        cleanup = this.pubsub.subscribe(answerId, (payload) => {
          subscriber.next({ data: payload } as any);
        });
      })().catch(() => subscriber.complete());

      return () => {
        if (cleanup) cleanup();
      };
    });
  }
}
