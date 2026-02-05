import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ActiveUser } from '@/common/decorators/active-user.decorator';
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
  /**
   * 학습 세션을 생성하고 첫 질문을 반환한다.
   * 카테고리/난이도에 따라 질문을 선택하고 가이드를 포함한다.
   */
  async createSession(
    @ActiveUser()
    user: { id: number },
    @Body(new ZodValidationPipe(CreateSessionSchema))
    dto: CreateSessionDto,
  ) {
    const userId = user.id;
    return this.sessionsService.createSession(userId, dto);
  }

  /**
   * 현재 진행중인 학습 세션이 있다면 해당 세션 정보를 반환한다.
   */
  @Get('active-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '진행 중인 세션 조회',
    description: '사용자의 현재 활성화된(종료되지 않은) 세션이 있는지 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    schema: {
      example: {
        hasSession: true,
        sessionId: 15,
        currentQuestionCount: 2,
      },
    },
  })
  async getInProgressSession(@ActiveUser() user: { id: number }) {
    return this.sessionsService.getInProgressSession(user.id);
  }

  /**
   * 진행 중인 세션의 현재 상태(문제, 진행도 등)를 반환한다.
   * 크레딧을 차감하지 않고 현재 상태를 반환한다.
   */
  @Get(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '세션 이어하기 (상태 복구)',
    description: '진행 중인 세션의 현재 상태(문제, 진행도 등)를 반환하여 학습을 재개합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    description: '이어할 세션 ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '세션 정보 로드 성공',
    schema: {
      example: {
        sessionId: 15,
        currentQuestionCount: 2,
        remainedCredit: 19,
        question: {
          questionId: 105,
          content: 'TCP와 UDP의 차이는?',
          guide: '연결 지향성 여부를 중심으로...',
          category: 'NETWORK',
          difficulty: 'MEDIUM',
          timeLimit: 300,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '유효하지 않은 세션' })
  async resumeSession(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.sessionsService.resumeSession(sessionId, user.id);
  }

  @Post(':sessionId/next-question')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
  /**
   * 진행 중 세션의 다음 질문을 제공한다.
   * 크레딧 확인 후 질문 카운트를 증가시킨다.
   */
  async getNextQuestion(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.sessionsService.getNextQuestion(sessionId, user.id);
  }

  @Post(':sessionId/deep-dive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
  /**
   * 답변을 기반으로 꼬리질문을 생성한다.
   * 유효한 답변과 세션인지 확인한 뒤 추가 질문을 생성한다.
   */
  async deepDive(
    @ActiveUser()
    user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe(DeepDiveRequestSchema))
    body: DeepDiveRequestDto,
  ) {
    const userId = user.id;

    return this.deepDiveService.execute({
      userId,
      sessionId,
      answerId: body.answerId,
    });
  }

  @Post(':sessionId/finish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
  /**
   * 학습 세션을 종료하고 정산 결과를 반환한다.
   * 점수/XP/레벨/스트릭을 포함한 결과를 반환한다.
   */
  async finishSession(
    @ActiveUser() user: { id: number },
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.sessionsService.finishSession(sessionId, user.id);
  }
}
