import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';

import { QuestionProviderService } from '../application/question-provider.service';
import { PickQuestionRequestDto } from './dto/pick-question.request.dto';

// 런타임 API 컨트롤러: POST /questions/pick
@Controller('questions')
export class QuestionProviderController {
  constructor(private readonly svc: QuestionProviderService) {}

  @Post('pick')
  async pick(@Body() body: PickQuestionRequestDto) {
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
