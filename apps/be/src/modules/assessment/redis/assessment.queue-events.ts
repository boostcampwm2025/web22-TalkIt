import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AssessmentSseEventSchema } from '../schemas/assessment-sse-event.schema';
import { ASSESS_REDIS_EVENTS } from '../worker/assessment.tokens';
import type {
  AssessmentQueueEvent,
  QueueCompletedEvent,
  QueueFailedEvent,
  QueueProgressEvent,
} from './queue-events.types';
import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class AssessmentQueueEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentQueueEventBus.name);
  private qes: QueueEvents[] = [];
  // jobId 별 subject + 구독자 수 + 지연 정리 타이머를 관리 (메모리 누수 방지)
  private readonly subjects = new Map<
    string,
    { subject: Subject<AssessmentQueueEvent>; refCount: number; cleanupTimer?: NodeJS.Timeout }
  >();

  constructor(@Inject(ASSESS_REDIS_EVENTS) private readonly redisEvents: IORedis) {
    // QueueEvents 인스턴스는 onModuleInit에서 초기화
  }

  /**
   * QueueEvents를 초기화하고 BullMQ 이벤트를 내부 Subject로 전달합니다.
   * - waitUntilReady: 초기 이벤트 유실 방지를 위해 준비 완료까지 대기합니다.
   * - progress/completed/failed: jobId 기준으로 구독자에게 이벤트 전달 후 정리(completed/failed).
   */
  async onModuleInit() {
    // 단일큐(legacy)는 제거됨: 분리 플로우 큐만 구독
    const queueNames = ['assessment:evaluate', 'assessment:feedback', 'assessment:reward'];
    this.qes = queueNames.map((name) => new QueueEvents(name, { connection: this.redisEvents }));

    // 모든 큐 준비 대기
    await Promise.all(this.qes.map((qe) => qe.waitUntilReady().catch(() => undefined)));

    const mapParentId = (jid: string): string => {
      const idx = jid.indexOf(':');
      return idx >= 0 ? jid.slice(0, idx) : jid;
    };

    const onProgress = ({ jobId, data }: { jobId: string | number | undefined; data: unknown }) => {
      if (!jobId) return;
      try {
        const payload = AssessmentSseEventSchema.parse(data);
        const parentId = mapParentId(String(jobId ?? ''));
        if (!parentId) return;
        this.emit(parentId, {
          type: 'progress',
          jobId: parentId,
          data: payload,
        } satisfies QueueProgressEvent);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Invalid progress payload for job ${jobId}: ${message}`);
      }
    };

    for (const qe of this.qes) {
      const queueName: string = ((qe as any)?.name ?? 'assessment') as string;
      qe.on('progress', onProgress as any);
      qe.on('completed', (({
        jobId,
        returnvalue,
      }: {
        jobId?: string | number;
        returnvalue: any;
      }) => {
        if (!jobId) return;
        const parentId = mapParentId(String(jobId ?? ''));
        if (!parentId) return;
        // reward 큐의 completed만 전달 (최종 완료)
        if (queueName === 'assessment:reward') {
          this.emit(parentId, {
            type: 'completed',
            jobId: parentId,
            data: returnvalue,
          } satisfies QueueCompletedEvent);
          this.complete(parentId);
        }
      }) as any);
      qe.on('failed', (({
        jobId,
        failedReason,
      }: {
        jobId?: string | number;
        failedReason?: string;
      }) => {
        if (!jobId) return;
        const parentId = mapParentId(String(jobId ?? ''));
        if (!parentId) return;
        // 어떤 단계 실패도 부모 실패로 전파
        this.emit(parentId, {
          type: 'failed',
          jobId: parentId,
          error: failedReason ?? 'failed',
        } satisfies QueueFailedEvent);
        this.complete(parentId);
      }) as any);
      qe.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`QueueEvents error: ${message}`);
      });
    }
  }

  /**
   * 특정 jobId에 대한 이벤트 스트림을 Observable로 제공합니다.
   * - 최초 구독 시 refCount 증가, 구독 해제 시 감소
   * - 구독자 0명이 되면 5분 후 Subject를 정리(메모리 누수 방지)
   */
  stream(jobId: string): Observable<AssessmentQueueEvent> {
    const entry = this.ensureEntry(jobId);
    return new Observable<AssessmentQueueEvent>((subscriber) => {
      entry.refCount++;
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = undefined;
      }

      const sub = entry.subject.subscribe(subscriber);

      return () => {
        sub.unsubscribe();
        entry.refCount = Math.max(0, entry.refCount - 1);
        if (entry.refCount === 0) {
          entry.cleanupTimer = setTimeout(
            () => {
              const current = this.subjects.get(jobId);
              if (current && current.refCount === 0) {
                current.subject.complete();
                this.subjects.delete(jobId);
              }
            },
            5 * 60 * 1000,
          );
        }
      };
    });
  }

  /** jobId의 구독자들에 이벤트를 전파합니다. */
  private emit(jobId: string, evt: AssessmentQueueEvent) {
    this.subjects.get(jobId)?.subject.next(evt);
  }

  /** jobId 스트림을 완료하고 Subject를 정리합니다. */
  private complete(jobId: string) {
    const entry = this.subjects.get(jobId);
    if (!entry) return;
    entry.subject.complete();
    this.subjects.delete(jobId);
  }

  /** jobId 전용 Subject 엔트리를 준비합니다. */
  private ensureEntry(jobId: string) {
    let entry = this.subjects.get(jobId);
    if (!entry) {
      entry = { subject: new Subject<AssessmentQueueEvent>(), refCount: 0 };
      this.subjects.set(jobId, entry);
    }
    return entry;
  }

  /** 모듈 종료 시 QueueEvents와 내부 Subject를 정리합니다. */
  async onModuleDestroy() {
    for (const qe of this.qes) {
      try {
        await qe.close();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`QueueEvents close failed: ${message}`);
      }
    }
    for (const [, entry] of this.subjects) {
      try {
        entry.subject.complete();
      } catch {
        // 의도적 무시: 종료 훅 실행 중 이미 완료되었거나 상태가 애매한 Subject에서
        // 발생하는 예외로 전체 종료 절차가 중단되지 않도록 예외를 삼킵니다.
      }
    }
    this.subjects.clear();
  }
}
