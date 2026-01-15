import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { type CreateSessionDto, CreateSessionSchema } from '../schemas/create-session.schema';
import { SessionsService } from '../services/sessions.service';

@ApiTags('Learning - Sessions')
@Controller('/api/learning/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: '학습 세션 생성 및 첫 질문 제공',
    description: '주제와 난이도를 선택하여 학습 세션을 생성하고 첫 질문을 반환합니다.',
  })
  @ApiBody({
    schema: zodSchemaToOpenAPI(CreateSessionSchema),
  })
  @ApiResponse({
    status: 200,
    description: '세션 생성 성공',
    schema: {
      example: {
        sessionId: 1,
        currentQuestionCount: 1,
        remainedCredit: 20,
        question: {
          questionId: 101,
          content: 'Process와 Thread의 차이점을 설명해주세요.',
          guide: '메모리 할당 방식과 컨텍스트 스위칭 중심으로 답변하세요.',
          category: 'OS',
          difficulty: 'MEDIUM',
          timeLimit: 300,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 (Enum 값 오류 또는 필수 값 누락)',
  })
  async createSession(
    @Body(new ZodValidationPipe(CreateSessionSchema))
    dto: CreateSessionDto,
  ) {
    const userId = 1; // TODO: 추후 인증 연동
    return this.sessionsService.createSession(userId, dto);
  }
}
