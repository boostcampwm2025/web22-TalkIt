import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import {
  type RecordSessionAnswerDto,
  RecordSessionAnswerSchema,
} from '../schemas/record-session-answer.schema';
import { SessionsRecordService } from '../services/sessions-record.service';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { zodSchemaToOpenAPI } from 'src/common/utils/zod-to-openapi.util';

@ApiTags('Learning - Sessions')
@Controller('/api/learning/sessions')
export class SessionsRecordController {
  constructor(private readonly sessionsRecordService: SessionsRecordService) {}

  @Post(':sessionId/record')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '세션 답변 녹음 제출',
    description: '음성 파일(audioFile)과 답변 메타데이터를 업로드합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    type: Number,
    example: 1,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ...zodSchemaToOpenAPI(RecordSessionAnswerSchema).properties,
        audioFile: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['audioFile'],
    },
  })
  @UseInterceptors(FileInterceptor('audioFile'))
  async recordAnswer(
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(RecordSessionAnswerSchema))
    dto: RecordSessionAnswerDto,
    @UploadedFile() audioFile?: Express.Multer.File,
  ) {
    if (!audioFile) {
      throw new BadRequestException({
        code: 'AUDIO_FILE_REQUIRED',
        message: 'audioFile 속성이 비어있습니다.',
      });
    }

    return this.sessionsRecordService.record(Number(sessionId), dto, audioFile);
  }
}
