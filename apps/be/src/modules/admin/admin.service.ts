import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnqueueJobBody, GenerationResult } from '../question-factory/types';
import { Queue } from 'bullmq';

export type EnqueueRequestBody = EnqueueJobBody;

export interface JobStatusResponse {
  id: string;
  state: string;
  result?: GenerationResult;
}

@Injectable()
export class AdminService {
  private readonly queue: Queue<EnqueueRequestBody>;
  private readonly url: string;

  constructor(private readonly config: ConfigService) {
    // Initialize URL before building queue options
    this.url = this.config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    const opts = this.buildQueueOptions();
    this.queue = new Queue('question-gen', opts);
  }

  private buildQueueOptions(): { connection: { host: string; port: number; password?: string } } {
    const u = new URL(this.url);
    const port = Number.parseInt(u.port || '6379', 10);
    const host = u.hostname || '127.0.0.1';
    const password = u.password || undefined;
    return { connection: { host, port, password } };
  }

  async enqueueBlueprintJob(body: EnqueueRequestBody): Promise<{ jobId: string | undefined }> {
    const job = await this.queue.add('question-gen.generate', body, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    return { jobId: job.id };
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id as string,
      state,
      result: (job.returnvalue as GenerationResult | undefined) ?? undefined,
    };
  }
}
