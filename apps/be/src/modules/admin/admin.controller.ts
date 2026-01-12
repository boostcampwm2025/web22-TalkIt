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
    if (!body || !body.domain || !body.topicId || !body.version || !body.nPerCell) {
      return { error: 'invalid_body' };
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
