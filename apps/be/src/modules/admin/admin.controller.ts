import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';

import { AdminService } from './admin.service';
import type { EnqueueRequestBody } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('question-gen')
  async enqueue(
    @Body() body: EnqueueRequestBody,
  ): Promise<{ jobId: string | undefined } | { error: string }> {
    // 토픽 모드와 용어 모드에 따른 유효성 검사
    if (!body || !body.domain || !body.version) return { error: 'invalid_body' };

    if (!('mode' in body) || body.mode === 'topic') {
      // topic mode validation
      const hasTopicId =
        'topicId' in body && typeof body.topicId === 'string' && body.topicId.length > 0;
      const hasNPerCell =
        'nPerCell' in body && typeof body.nPerCell === 'number' && Number.isFinite(body.nPerCell);

      if (!hasTopicId || !hasNPerCell) return { error: 'invalid_body' };
    } else if (body.mode === 'term') {
      const hasConcept = 'conceptLevel' in body && typeof body.conceptLevel === 'string';
      const hasTerm = 'term' in body && typeof body.term === 'string' && body.term.length > 0;
      const hasCount =
        'count' in body && typeof body.count === 'number' && Number.isFinite(body.count);
      if (!hasConcept) return { error: 'invalid_body' };

      // term 또는 count 둘 중 하나는 반드시 있어야 함
      if (!hasTerm && !hasCount) return { error: 'invalid_body' };
    }
    const res = await this.admin.enqueueBlueprintJob(body);
    return res;
  }

  @Get('question-gen/:jobId')
  async status(@Param('jobId') jobId: string) {
    const s = await this.admin.getJobStatus(jobId);
    if (!s) throw new NotFoundException('job_not_found');
    return s;
  }
}
