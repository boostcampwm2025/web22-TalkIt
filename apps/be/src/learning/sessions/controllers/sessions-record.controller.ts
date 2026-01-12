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

import { RecordSessionAnswerDto } from '../dto/record-session-answer.dto';
import { SessionsRecordService } from '../services/sessions-record.service';

@Controller('/api/learning/sessions')
export class SessionsRecordController {
  constructor(private readonly sessionsRecordService: SessionsRecordService) {}

  @Post(':sessionId/record')
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
