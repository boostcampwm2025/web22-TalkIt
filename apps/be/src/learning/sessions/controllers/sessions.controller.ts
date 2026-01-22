import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from '@/common/utils/zod-to-openapi.util';

import { type CreateSessionDto, CreateSessionSchema } from '../schemas/create-session.schema';
import { type DeepDiveRequestDto, DeepDiveRequestSchema } from '../schemas/deep-dive.schema';
import { FinishSessionResponseSchema } from '../schemas/finish-session.schema';
import { DeepDiveService } from '../services/deep-dive.service';
import { SessionsService } from '../services/sessions.service';

@ApiTags('Learning - Sessions')
@Controller('/api/learning/sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly deepDiveService: DeepDiveService,
  ) {}

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

  @Post(':sessionId/next-question')
  @ApiOperation({
    summary: '다음 질문 제공',
    description: '진행 중인 학습 세션에서 다음 질문을 제공합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    description: '학습 세션 ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '다음 질문 제공 성공',
    schema: {
      example: {
        currentQuestionCount: 3,
        remainedCredit: 20,
        question: {
          questionId: 102,
          content: 'Deadlock의 발생 조건 4가지를 설명해주세요.',
          guide: '상호 배제, 점유와 대기, 비선점, 순환 대기를 중심으로 설명하세요.',
          category: 'OS',
          difficulty: 'MEDIUM',
          timeLimit: 300,
        },
      },
    },
  })
  @ApiNoContentResponse({
    description: '더 이상 제공할 질문이 없음',
  })
  @ApiBadRequestResponse({
    description: '유효하지 않은 세션이거나 잔여 크레딧 부족',
  })
  async getNextQuestion(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.sessionsService.getNextQuestion(sessionId);
  }
  // 꼬리질문(Deep Dive) 요청
  @Post(':sessionId/deep-dive')
  @ApiOperation({
    summary: '꼬리질문(Deep Dive) 생성',
    description: '사용자 답변을 기반으로 꼬리질문을 생성합니다.',
  })
  @ApiBody({
    schema: zodSchemaToOpenAPI(DeepDiveRequestSchema),
  })
  @ApiResponse({
    status: 200,
    description: '꼬리질문 생성 성공',
  })
  @ApiBadRequestResponse({
    description: '세션이 유효하지 않거나, 답변/크레딧이 없음',
  })
  async deepDive(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe(DeepDiveRequestSchema))
    body: DeepDiveRequestDto,
  ) {
    const userId = 1; // TODO: auth

    return this.deepDiveService.execute({
      userId,
      sessionId,
      answerId: body.answerId,
    });
  }

  // 세션 종료 요청
  @Post(':sessionId/finish')
  @ApiOperation({
    summary: '학습 세션 종료 및 리워드 정산',
    description: '세션을 종료하고 획득한 경험치, 레벨 정보, 답변 결과 목록을 반환합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    description: '종료할 세션 ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '정산 성공',
    schema: zodSchemaToOpenAPI(FinishSessionResponseSchema),
  })
  @ApiBadRequestResponse({
    description: '이미 종료된 세션이거나 유효하지 않은 요청',
  })
  async finishSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.sessionsService.finishSession(sessionId);
  }
}
