import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { AssessmentService } from './assessment.service';
import type { AssessRequestDto } from './schemas/assess-request.schema';
import { AssessRequestSchema } from './schemas/assess-request.schema';

@ApiTags('Learning - Assessment')
@Controller('/api/learning')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  @Post('/sessions/:sessionId/assess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(202)
  @ApiOperation({ summary: '세션 답변 제출 + 평가 비동기 시작' })
  @ApiParam({ name: 'sessionId', type: Number })
  @ApiBody({ schema: zodSchemaToOpenAPI(AssessRequestSchema) })
  @ApiAcceptedResponse({ description: '작업 수락됨' })
  @ApiBadRequestResponse({ description: '검증 실패 혹은 권한 오류' })
  async submitAssess(
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(AssessRequestSchema)) body: AssessRequestDto,
    @ActiveUser() user: { id: number },
  ) {
    const userId = user.id;
    return this.service.submitAndAssess(userId, Number(sessionId), body);
  }

  @Get('/answers/:answerId/assess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '평가 스냅샷 조회' })
  @ApiParam({ name: 'answerId', type: Number })
  async getSnapshot(@Param('answerId') answerId: string, @ActiveUser() user: { id: number }) {
    const userId = user.id;
    return this.service.getSnapshot(userId, Number(answerId));
  }
}
