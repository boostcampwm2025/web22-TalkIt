import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import axios from 'axios';

@Injectable()
export class ClovaSttProvider {
  constructor(private config: ConfigService) {}

  // 안전한 URL 조합기: base의 꼬리 슬래시/중복 슬래시를 정규화
  private joinUrl(base: string, path: string): string {
    const cleanedBase = (base ?? '').replace(/\/+$/, '');
    const cleanedPath = (path ?? '').replace(/^\/+/, '');
    return `${cleanedBase}/${cleanedPath}`;
  }

  async requestSTT(objectKey: string, language: string): Promise<string> {
    const url = this.joinUrl(
      this.config.get<string>('CLOVA_SPEECH_INVOKE_URL') ?? '',
      'recognizer/object-storage',
    );

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
      },
      {
        headers: {
          'X-CLOVASPEECH-API-KEY': this.config.get('CLOVA_SPEECH_SECRET_KEY'),
        },
      },
    );

    // 테스트 확인용 상세로그 입니다!!!!!!! -> 나중에 지우면 될 것 같아요!
    console.log('-----------------------------');
    console.log(' Clova RAW response:', JSON.stringify(response.data, null, 2));
    console.log('--- API /api/stt 상세 로그 ---');
    console.log('1. 전체 텍스트 (화자 구분 포함):', response.data.text);

    console.log('\n2. 화자별 세그먼트 목록 (시간 정보 포함):');
    if (response.data.segments && response.data.segments.length > 0) {
      response.data.segments.forEach((segment) => {
        // segment.speaker가 undefined일 경우, diarization.label 또는 speaker.label 사용 시도
        const speakerLabel = segment.diarization
          ? segment.diarization.label
          : segment.speaker
            ? segment.speaker.label
            : 'N/A';
        // 정확도
        const confidence = segment.confidence;
        // 인식된 단어 목록
        const words = segment.words;
        console.log(
          `[화자 ${speakerLabel}] 시작: ${segment.start}ms, 종료: ${segment.end}ms, 내용: ${segment.text}`,
        );
        console.log(`    - 정확도: ${confidence !== undefined ? confidence.toFixed(2) : 'N/A'}`);
        console.log(`    - 인식된 단어들: ${words ? words.map((w) => w[2]).join(', ') : 'N/A'}`);
      });
    } else {
      console.log('세그먼트(segments) 정보가 없거나 비어 있습니다. 화자 인식이 실패했을 가능성.');
    }
    console.log('-----------------------------');

    return response.data.text;
  }
}
