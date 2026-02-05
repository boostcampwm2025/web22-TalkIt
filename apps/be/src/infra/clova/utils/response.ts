// CLOVA 응답 유틸리티
// - JSON 파싱/스키마 검증/에러 처리/콘텐츠·토큰 추출 공통 함수 집합
import { HttpException } from '@nestjs/common';
import type { Logger } from '@nestjs/common';

import type { ClovaResponse } from '../schemas/clova.schemas';
import { clovaSchema } from '../schemas/clova.schemas';
import type { ZodError } from 'zod';

export function parseJsonOrThrow(
  rawText: string,
  res: Response,
  requestId: string,
  contentType: string,
): unknown {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new HttpException(
      {
        statusCode: res.status,
        message: e instanceof Error ? e.message : 'CLOVA response parse failed',
        requestId,
        contentType,
        rawTextPreview: rawText.slice(0, 500),
      },
      res.ok ? 500 : res.status,
    );
  }
}

export function safeParseClovaResponse(
  json: unknown,
): { ok: true; data: ClovaResponse } | { ok: false; raw: unknown; error: ZodError } {
  const parsed = clovaSchema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, raw: json, error: parsed.error };
}

// CLOVA 바디의 status.code를 HTTP 에러로 정규화해 throw
// - 서버가 HTTP 200이라도 바디에 오류 코드를 담아 보내는 경우가 있어 이를 우선적으로 판단
// - 2xx(예: 20000, 20400 등)는 통과, 표준 3자리 코드는 그대로 사용, 그 외는 문서 기준으로 4xx/5xx로 매핑
export function throwHttpErrorFromClovaBodyIfAny(
  json: unknown,
  requestId: string,
  logger?: Logger,
) {
  // 타입 가드
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  // CLOVA 응답 바디에서 status.code 및 status.message 추출
  let statusCodeUnknown: unknown;
  let statusMessageUnknown: unknown;
  if (isRecord(json) && isRecord(json['status'])) {
    const st = json['status'];
    statusCodeUnknown = st['code'];
    statusMessageUnknown = st['message'];
  }

  // ErrorEvent 문서에서 status.code가 객체일 수 있으므로 안전 추출
  const extractCodeString = (v: unknown): string | undefined => {
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v;
    if (isRecord(v)) {
      const inner =
        typeof v.code === 'number' || typeof v.code === 'string'
          ? v.code
          : typeof v.value === 'number' || typeof v.value === 'string'
            ? v.value
            : undefined;
      return inner !== undefined ? String(inner) : undefined;
    }
    return undefined;
  };

  const code = extractCodeString(statusCodeUnknown);
  if (!code) return;
  // 성공 케이스: 2xx(20000, 20400 등)
  if (/^20/.test(code)) return;

  // 기본 HTTP 매핑: 앞 3자리가 표준 4xx/5xx인 경우 그대로 사용
  const first3 = code.slice(0, 3);
  const n3 = Number(first3);
  const stdSet = new Set([400, 401, 403, 404, 406, 408, 413, 415, 424, 429, 500, 501, 504]);

  let httpFromBody: number | undefined;
  if (!Number.isNaN(n3) && stdSet.has(n3)) {
    httpFromBody = n3;
  } else {
    // 6xxxx 계열 매핑: 문서 분류에 따라 4xx/5xx로 정규화
    if (/^(61|62|63)/.test(code)) {
      httpFromBody = 400; // 클라이언트 스킬 오류
    } else if (['64400', '65001', '65400', '64429'].some((p) => code.startsWith(p))) {
      httpFromBody = 400; // 문서상 4xx로 분류된 64xxx/65xxx 일부
    } else if (['64000', '64424', '64500', '65002'].some((p) => code.startsWith(p))) {
      httpFromBody = 500; // 서버 스킬 오류로 분류된 64xxx/65xxx 일부
    } else if (/^5/.test(code)) {
      httpFromBody = 500; // 그 외 5xx 유사 코드는 서버 오류로 처리
    } else {
      httpFromBody = 400; // 알 수 없는 코드는 클라이언트 오류로 처리
    }
  }

  const errPayload = {
    statusCode: httpFromBody,
    message: typeof statusMessageUnknown === 'string' ? statusMessageUnknown : 'CLOVA error',
    clovaStatus:
      statusCodeUnknown !== undefined || statusMessageUnknown !== undefined
        ? {
            code: statusCodeUnknown as string | number | undefined,
            message: typeof statusMessageUnknown === 'string' ? statusMessageUnknown : undefined,
          }
        : undefined,
    requestId,
  } as const;

  try {
    if (logger) {
      logger.error(
        `CLOVA body error req=${requestId} code=${code} → http=${httpFromBody} msg=${errPayload.message}`,
      );
    }
  } catch {
    // 로깅 중 예외 방지
  }

  throw new HttpException(errPayload, httpFromBody);
}

export function extractContentFromCandidates(json: unknown): string {
  // 단순화: 현재 계약상 콘텐츠는 result.message.content 경로로만 전달됨
  // - 스키마(response-body.schema.ts) 상 content는 string
  // - 추후 포맷 변화가 생기면 이 함수를 다시 확장
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  let result: unknown;
  if (isRecord(json)) result = json['result'];

  let message: unknown;
  if (isRecord(result)) message = result['message'];

  let contentUnknown: unknown;
  if (isRecord(message)) contentUnknown = message['content'];

  return typeof contentUnknown === 'string' ? contentUnknown : '';
}
