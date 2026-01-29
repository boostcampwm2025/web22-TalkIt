import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ASSESS_REDIS_EVENTS } from './assessment.worker';
import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { Observable, Subject } from 'rxjs';

type QueueEvent =
  | { type: 'progress'; jobId: string; data: any }
  | { type: 'completed'; jobId: string; data: any }
  | { type: 'failed'; jobId: string; error: string };

@Injectable()
export class AssessmentQueueEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentQueueEventBus.name);
  private readonly qe: QueueEvents;
  // jobId 별 subject + 구독자 수 + 지연 정리 타이머를 관리 (메모리 누수 방지)
  private readonly subjects = new Map<
    string,
    { subject: Subject<QueueEvent>; refCount: number; cleanupTimer?: NodeJS.Timeout }
  >();

  constructor(@Inject(ASSESS_REDIS_EVENTS) private readonly redisEvents: IORedis) {
    this.qe = new QueueEvents('assessment', { connection: this.redisEvents });
  }

  async onModuleInit() {
    // 준비 완료까지 기다리는게 안전 (초기 이벤트 누락 방지)
    await (this.qe as any).waitUntilReady?.();

    this.qe.on('progress', ({ jobId, data }) => {
      if (!jobId) return;
      this.emit(String(jobId), { type: 'progress', jobId: String(jobId), data });
    });

    this.qe.on('completed', ({ jobId, returnvalue }) => {
      if (!jobId) return;
      const id = String(jobId);
      this.emit(id, { type: 'completed', jobId: id, data: returnvalue });
      this.complete(id);
    });

    this.qe.on('failed', ({ jobId, failedReason }) => {
      if (!jobId) return;
      const id = String(jobId);
      this.emit(id, { type: 'failed', jobId: id, error: failedReason ?? 'failed' });
      this.complete(id);
    });

    this.qe.on('error', (err) => {
      this.logger.error(`QueueEvents error: ${err?.message ?? err}`, err?.stack);
    });
  }

  stream(jobId: string): Observable<QueueEvent> {
    // Subject 엔트리를 준비하고 refCount 증가
    const entry = this.ensureEntry(jobId);
    return new Observable<QueueEvent>((subscriber) => {
      entry.refCount++;
      // 기존 cleanup 타이머가 있었다면 취소 (재구독)
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = undefined;
      }

      const sub = entry.subject.subscribe(subscriber);

      return () => {
        sub.unsubscribe();
        // 구독자 수 감소 후 0이 되면 지연 정리 타이머 설정 (예: 5분)
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

  private emit(jobId: string, evt: QueueEvent) {
    this.subjects.get(jobId)?.subject.next(evt);
  }

  private complete(jobId: string) {
    const entry = this.subjects.get(jobId);
    if (!entry) return;
    entry.subject.complete();
    this.subjects.delete(jobId);
  }

  private ensureEntry(jobId: string) {
    let entry = this.subjects.get(jobId);
    if (!entry) {
      entry = { subject: new Subject<QueueEvent>(), refCount: 0 };
      this.subjects.set(jobId, entry);
    }
    return entry;
  }

  async onModuleDestroy() {
    // 종료 시 예외 있어도 방어적으로 처리
    try {
      await (this.qe as any)?.close?.();
    } catch (e: any) {
      this.logger.warn(`QueueEvents close failed: ${e?.message ?? e}`);
    }
    for (const [jobId, entry] of this.subjects) {
      try {
        entry.subject.complete();
      } catch {}
      this.subjects.delete(jobId);
    }
  }
}
