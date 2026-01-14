import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { RecordSessionAnswerDto } from '../dto/record-session-answer.dto';
import { SessionsRecordService } from '../services/sessions-record.service';

@ApiTags('Learning - Sessions')
@Controller('/api/learning/sessions')
export class SessionsRecordController {
  constructor(private readonly sessionsRecordService: SessionsRecordService) {}

  @Post(':sessionId/record')
  @ApiOperation({
    summary: '세션 답변 녹음 제출',
    description: '음성 파일(audioFile)과 답변 메타데이터를 업로드합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    type: Number,
    description: '답변을 기록할 세션 ID',
    example: 1,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questionId: {
          type: 'string',
          example: '101',
        },
        audioFile: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['questionId', 'audioFile'],
    },
  })
  @UseInterceptors(FileInterceptor('audioFile'))
  async recordAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: RecordSessionAnswerDto,
    @UploadedFile() audioFile?: Express.Multer.File,
  ) {
    // 디버깅용 -> 추후 삭제
    console.log('컨트롤러 진입');
    console.log({
      sessionId,
      dto,
      audioFileExists: !!audioFile,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.mimetype,
    });

    if (!audioFile) {
      throw new BadRequestException({
        code: 'AUDIO_FILE_REQUIRED',
        message: 'audioFile 속성이 비어있습니다.',
      });
    }

    return this.sessionsRecordService.record(Number(sessionId), dto, audioFile);
  }
}
