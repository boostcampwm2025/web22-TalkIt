import { Controller, Param, ParseIntPipe, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';

import { AssessmentRepository } from '../assessment.repository';
import { AssessmentPubSub } from '../pubsub/assessment.pubsub';
import { Observable } from 'rxjs';

type SseEvent = MessageEvent;

@ApiTags('Learning - Assessment')
@Controller('/api/learning')
export class AssessmentSseController {
  constructor(
    private readonly pubsub: AssessmentPubSub,
    private readonly repo: AssessmentRepository,
  ) {}

  @Sse(':sessionId/answers/:answerId/assess/stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '평가 진행 상황 SSE 스트림' })
  @ApiParam({ name: 'answerId', type: Number })
  sse(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('answerId') answerIdParam: string,
  ): Observable<SseEvent> {
    const answerId = Number(answerIdParam);
    const userId = user.id;

    return new Observable<SseEvent>((subscriber) => {
      let cleanup: (() => void) | null = null;
      (async () => {
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
