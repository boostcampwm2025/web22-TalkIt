import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { QuestionProviderService } from '../application/question-provider.service';
import {
  type PickQuestionRequestDto,
  PickQuestionRequestSchema,
} from './schemas/pick-question-request.schema';

// 런타임 API 컨트롤러: POST /questions/pick
@ApiTags('Question Provider')
@Controller('questions')
export class QuestionProviderController {
  constructor(private readonly svc: QuestionProviderService) {}

  @Post('pick')
  @ApiOperation({
    summary: '질문 선택',
    description: '도메인과 난이도를 기반으로 질문을 선택합니다.',
  })
  @ApiBody({
    schema: zodSchemaToOpenAPI(PickQuestionRequestSchema),
  })
  @ApiResponse({
    status: 200,
    description: '질문 선택 성공',
    schema: {
      example: {
        questionId: 101,
        domain: 'OS',
        difficulty: 'MEDIUM',
        topicId: 'os-process-thread',
        content: 'Process와 Thread의 차이점을 설명해주세요.',
        mustInclude: ['메모리', '컨텍스트 스위칭'],
        timeLimitSec: 300,
      },
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 (Enum 값 오류 또는 필수 값 누락)',
  })
  async pick(
    @Body(new ZodValidationPipe(PickQuestionRequestSchema))
    body: PickQuestionRequestDto,
  ) {
    try {
      return await this.svc.pickOne(body.domain, body.difficulty);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      // Warm-up 누락 등은 503으로 매핑
      if (msg.includes('not warmed')) {
        throw new HttpException(msg, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
