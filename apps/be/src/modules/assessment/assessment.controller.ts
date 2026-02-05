import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { AssessmentService } from './assessment.service';
import type { AssessRequestDto } from './dto/assess-request.dto';
import { AssessRequestSchema } from './schemas/assess-request.schema';
import { AssessResponseSchema } from './schemas/assess-response.schema';
import { GetFeedbackResponseSchema } from './schemas/get-feedback-response.schema';

@ApiTags('Learning - Assessment')
@Controller('/api/learning')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  /**
   * 학습 평가 컨트롤러
   * - 세션에 대한 답변 제출과 비동기 평가 작업 생성(submitAssess)
   * - 생성된 평가 결과 스냅샷 조회(getSnapshot)
   * - 인증 필요(JWT), Zod 파이프를 통해 요청 본문 스키마 검증 수행
   */
  @Post('/sessions/:sessionId/assess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(202)
  @ApiOperation({ summary: '세션 답변 제출 + 평가 비동기 시작' })
  @ApiParam({ name: 'sessionId', type: Number })
  @ApiBody({ schema: zodSchemaToOpenAPI(AssessRequestSchema) })
  @ApiAcceptedResponse({
    description: '작업 수락됨',
    schema: zodSchemaToOpenAPI(AssessResponseSchema),
  })
  @ApiBadRequestResponse({ description: '검증 실패' })
  @ApiUnauthorizedResponse({ description: '인증 실패' })
  @ApiForbiddenResponse({ description: '권한 없음' })
  async submitAssess(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe<AssessRequestDto>(AssessRequestSchema)) body: AssessRequestDto,
  ) {
    const userId = user.id;
    // 파이프에서 1차 검증 완료. linter 타입 안정성을 위해 재-파싱으로 타입 보장
    const payload = AssessRequestSchema.parse(body);
    return this.service.submitAndAssess(userId, sessionId, payload);
  }

  @Get('/answers/:answerId/assess')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '평가 스냅샷 조회' })
  @ApiParam({ name: 'answerId', type: Number })
  @ApiOkResponse({
    description: '평가 결과 스냅샷',
    schema: zodSchemaToOpenAPI(GetFeedbackResponseSchema),
  })
  @ApiUnauthorizedResponse({ description: '인증 실패' })
  @ApiForbiddenResponse({ description: '권한 없음' })
  @ApiUnprocessableEntityResponse({ description: '평가 실패 상태' })
  @ApiConflictResponse({ description: '평가 미완료 상태' })
  /**
   * 평가 스냅샷 조회
   * - 사용자가 소유한 답변인지 확인 후, 완료된 평가 결과를 반환합니다.
   * - 진행 중/실패한 상태는 서비스 레이어에서 적절한 예외를 발생시킵니다.
   */
  async getSnapshot(
    @ActiveUser() user: { id: number },
    @Param('answerId', ParseIntPipe) answerId: number,
  ) {
    const userId = user.id;
    return this.service.getSnapshot(userId, answerId);
  }
}
