import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';

import IORedis from 'ioredis';

type EventPayload = {
  jobId: number;
  answerId: number;
  status: string;
  timestamp: string;
  error?: string | null;
};

export const ASSESS_PUB = Symbol('ASSESS_PUB');
export const ASSESS_SUB = Symbol('ASSESS_SUB');

@Injectable()
export class AssessmentPubSub implements OnModuleDestroy {
  constructor(
    @Inject(ASSESS_PUB) private readonly pub: IORedis,
    @Inject(ASSESS_SUB) private readonly sub: IORedis,
  ) {}

  private channelName(answerId: number) {
    return `assessment:answer:${answerId}`;
  }

  async publish(answerId: number, payload: EventPayload) {
    await this.pub.publish(this.channelName(answerId), JSON.stringify(payload));
  }

  subscribe(answerId: number, handler: (p: EventPayload) => void) {
    const channel = this.channelName(answerId);
    const onMessage = (ch: string, message: string) => {
      if (ch !== channel) return;
      try {
        const data = JSON.parse(message);
        handler(data);
      } catch {
        // ignore malformed
      }
    };
    this.sub.subscribe(channel);
    this.sub.on('message', onMessage);
    return () => {
      this.sub.off('message', onMessage);
      this.sub.unsubscribe(channel).catch(() => undefined);
    };
  }

  onModuleDestroy() {
    // connections managed by module providers
  }
}
