import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import axios from 'axios';

@Injectable()
export class ClovaSttProvider {
  private readonly logger = new Logger(ClovaSttProvider.name);

  constructor(private config: ConfigService) {}

  // 안전한 URL 조합기: base의 꼬리 슬래시/중복 슬래시를 정규화
  private joinUrl(base: string, path: string): string {
    const cleanedBase = (base ?? '').replace(/\/+$/, '');
    const cleanedPath = (path ?? '').replace(/^\/+/, '');
    return `${cleanedBase}/${cleanedPath}`;
  }

  async requestSTT(objectKey: string, language: string, boostWords: string[]): Promise<string> {
    const url = this.joinUrl(
      this.config.get<string>('CLOVA_SPEECH_INVOKE_URL') ?? '',
      'recognizer/object-storage',
    );

    const boostings =
      boostWords && boostWords.length > 0
        ? [
            {
              words: boostWords.join(','),
              weight: 1,
            },
          ]
        : undefined;

    this.logger.log('Requesting Clova STT', {
      objectKey,
      language,
      boostWordsCount: boostWords?.length ?? 0,
    });

    const response = await axios.post(
      url,
      {
        dataKey: objectKey,
        language,
        completion: 'sync',
        fullText: true,
        diarization: {
          enable: true, // 화자 인식
        },
        ...(boostings && { boostings }),
      },
      {
        headers: {
          'X-CLOVASPEECH-API-KEY': this.config.get('CLOVA_SPEECH_SECRET_KEY'),
        },
      },
    );

    if (response.data.segments && response.data.segments.length > 0) {
      response.data.segments.forEach((segment) => {
        const speakerLabel = segment.diarization
          ? segment.diarization.label
          : segment.speaker
            ? segment.speaker.label
            : 'N/A';

        const confidence = segment.confidence;
        const words = segment.words;

        // 값 접근만 유지 (로직 변경 없음)
        void speakerLabel;
        void confidence;
        void words;
        void segment.start;
        void segment.end;
        void segment.text;
      });
    }

    const boostingsResponse = response.data?.params?.boostings;
    if (boostingsResponse && boostingsResponse.length > 0) {
      boostingsResponse.forEach((b) => {
        void b.words;
      });
    }

    this.logger.log('Clova STT completed', {
      textLength: response.data.text?.length,
    });

    return response.data.text;
  }
}
