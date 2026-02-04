// CLOVA 챗 API 호출 서비스
// - 요청/응답 생성, 스키마 검증, 오류 처리, 콘텐츠/토큰 추출까지 캡슐화
// - 외부에서는 chat(messages, options)만 호출하면 결과를 일관되게 획득
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ChatMessage, ChatOptions, ChatResult } from './dtos/types';
import { buildChatRequestBody, generateRequestId, makeChatUrl, makeHeaders } from './utils/request';
import {
  extractContentFromCandidates,
  parseJsonOrThrow,
  safeParseClovaResponse,
  throwHttpErrorFromClovaBodyIfAny,
} from './utils/response';

@Injectable()
export class ClovaService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(ClovaService.name);

  constructor(private readonly config: ConfigService) {
    // 기본 URL을 최신 문서 기준의 스트리밍 도메인으로 변경
    this.baseUrl =
      this.config.get<string>('CLOVA_BASE_URL') ?? 'https://clovastudio.stream.ntruss.com';
    this.model = this.config.get<string>('CLOVA_MODEL') ?? 'HCX-007';
    this.apiKey = this.config.get<string>('CLOVA_API_KEY') ?? '';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const url = makeChatUrl(this.baseUrl, this.model);
    const requestId = generateRequestId();

    // SO(JSON)과 Thinking은 상호배타적: SO가 지정되면 thinking 옵션은 무시(안전 로그)
    if (options.responseFormat?.type === 'json' && options.thinking && !options.noThinking) {
      this.logger.debug(
        `CLOVA options: responseFormat=json → thinking 옵션은 무시됩니다. req=${requestId}`,
      );
    }

    const body = buildChatRequestBody(messages, options);

    // 단일 요청 처리: 재시도/자동 강등 없이 즉시 실패를 표면화
    const res = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(this.apiKey, requestId),
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') ?? '';
    const rawText = await res.text();

    let parsedJson: unknown;
    try {
      parsedJson = parseJsonOrThrow(rawText, res, requestId, contentType);
    } catch (e) {
      // JSON 파싱 실패 로그(상세 정보는 예외 바디에 포함됨)
      this.logger.error(
        `CLOVA parse error req=${requestId} status=${res.status} ct=${contentType} msg=${(e as Error)?.message ?? e}`,
      );
      throw e;
    }
    const sp = safeParseClovaResponse(parsedJson);
    const json: unknown = sp.ok ? sp.data : parsedJson;

    // CLOVA 전용 status.code를 HTTP 에러로 정규화하여 필요 시 예외로 전파
    throwHttpErrorFromClovaBodyIfAny(json, requestId, this.logger);

    // HTTP 에러인 경우 예외로 전파
    if (!res.ok) {
      // HTTP 상태 비정상 로그
      const preview = rawText.replace(/\s+/g, ' ').slice(0, 200);
      this.logger.error(
        `CLOVA http error req=${requestId} status=${res.status} ct=${contentType} preview=${preview}`,
      );
      throw new HttpException(
        {
          statusCode: res.status,
          message: 'CLOVA request failed',
          details: json,
          requestId,
        },
        res.status,
      );
    }

    // 성공 시 콘텐츠 추출
    const content = extractContentFromCandidates(json);

    return { requestId, content, raw: json };
  }
}
