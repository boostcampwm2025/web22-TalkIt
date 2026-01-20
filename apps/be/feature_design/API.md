# 학습 평가 API 명세

- 기본 URL: `/api/learning`
- 인증: JWT 필요(현재 데모에서는 `userId=1` 고정)

## 답변 제출 + 평가 시작

- `POST` `/api/learning/sessions/:sessionId/assess`
- Body:
  - `questionId: number`
  - `answerText: string`
  - `timeSpentSec: number`
- 동작: UserAnswer 생성 → AssessmentJob 생성(QUEUED) → 비동기 잡 큐로 enqueue
- 응답: `202 Accepted`

```json
{ "jobId": 1, "answerId": 10, "status": "QUEUED" }
```

- 에러: 400(검증오류/권한오류), 404(세션없음)

## 평가 진행 상황 스트림(SSE)

- `GET` `/api/learning/answers/:answerId/assess/stream`
- 권한: 답변 소유자만 구독 가능
- 페이로드(JSON 문자열):

```json
{
  "jobId": 1,
  "answerId": 10,
  "status": "EVALUATING|FEEDBACKING|REWARDING|DONE|FAILED",
  "timestamp": "2026-01-20T00:00:00.000Z",
  "error": null
}
```

## 평가 스냅샷 조회(재연결 복구)

- `GET` `/api/learning/answers/:answerId/assess`
- 응답 예시:

```json
{
  "jobId": 1,
  "answerId": 10,
  "status": "FEEDBACKING",
  "result": { "score": 72, "feedback": { "summary": "..." } }
}
```

## 상태 Enum (AssessmentJob.status)

- `QUEUED`, `EVALUATING`, `FEEDBACKING`, `REWARDING`, `DONE`, `FAILED`
- 선택: `FAILED_EVALUATION`, `FAILED_FEEDBACK`
