# 학습 평가 테스트 가이드

## 사전 준비

- Redis/DB 기동: `pnpm run db:up` 및 `pnpm run cache:up`
- Redis, MySQL 준비 후 서버 실행: `REDIS_URL=redis://127.0.0.1:6379 pnpm run dev`
- 스모크 테스트: `feature_design/TEST.md` 단계대로 진행

### DB 스키마 세팅 & 시딩 스크립트

- Prisma 코드 생성:
  - `pnpm prisma generate`
- DB 마이그레이션(초기 스키마 적용):
  - `pnpm prisma migrate dev -n init_assessment`
- 질문 데이터 Import(로컬 JSONL → DB):
  - `pnpm run script:import -- -source local -path ./resource`
  - 개별 파일로도 가능: `pnpm run script:import -- -source local -path ./resource/os_terms_questions.jsonl`
- 질문 풀 워밍업(옵션, Redis 캐시 구성):
  - `pnpm run script:warmup`
- (선택) 오브젝트 스토리지 업로드: DB 시딩과는 별개이며, 객체 스토리지 파이프라인 테스트용
  - `pnpm run script:upload -- -path ./resource/os_terms_questions.jsonl`

## 스모크 테스트 시나리오

1. 세션 생성: `POST /api/learning/sessions` (기존 기능)
   - 응답에서 `sessionId` 확보
2. 답변 제출: `POST /api/learning/sessions/:sessionId/assess`
   - Body: `{ questionId, answerText, timeSpentSec }`
   - 기대: `202`와 `{ jobId, answerId, status:QUEUED }`
3. 스트림 구독: `GET /api/learning/answers/:answerId/assess/stream` (Redis Pub/Sub 기반)
   - 기대: `EVALUATING -> FEEDBACKING -> REWARDING -> DONE` 순서 이벤트 수신
4. 스냅샷 조회: `GET /api/learning/answers/:answerId/assess`
   - 기대: 최종 `status:DONE` 및 `result.score`, `result.feedback` 존재

## cURL 예시

세션 생성:

```bash
curl -X POST http://localhost:3000/api/learning/sessions \
  -H 'Content-Type: application/json' \
  -d '{"category":"OS","difficulty":"MEDIUM"}'
```

제출+평가 시작:

```bash
curl -X POST http://localhost:3000/api/learning/sessions/2/assess \
  -H 'Content-Type: application/json' \
  -d '{"questionId":538,"answerText":"예시 답변","timeSpentSec":42}'
```

스냅샷:

```bash
curl http://localhost:3000/api/learning/answers/10/assess
```

SSE 구독(브라우저에서 권장):

```bash
curl http://localhost:3000/api/learning/answers/10/assess/stream
```

## 중복/멱등성 테스트

- 같은 `answerId`로는 하나의 `AssessmentJob`만 생성됨(유니크 제약)
- BullMQ enqueue 시 `jobId=answer-{answerId}`로 중복 enqueue 방지
- (선택 정책) 동일 (sessionId, questionId)에 대해 중복 요청 시 409 처리 가능 — 현재 버전은 미구현

## 실패 처리 테스트

- 내부 오류를 강제로 유발한 경우, `FAILED` 상태와 `error` 필드가 SSE/스냅샷에 반영되는지 확인

## 재연결 복구 테스트

- SSE 연결을 중단했다가 재연결 후, `GET /answers/:answerId/assess`로 현재 상태/결과 확인

## 보안/권한 테스트

- (JWT 연동 후) 다른 사용자 토큰으로 접근 시 403/404 처리 확인

## 검수 체크리스트

- [ ] 제출 API가 202로 빠르게 응답한다
- [ ] UserAnswer가 생성되고 answerId가 반환된다
- [ ] Worker가 단계 전이를 수행한다(EVALUATING/FEEDBACKING/REWARDING/DONE)
- [ ] 점수는 평가 완료 시 저장된다
- [ ] 피드백은 피드백 완료 시 저장된다
- [ ] 스냅샷이 현재 상태를 정확히 반영한다
- [ ] SSE가 단계 전이를 순서대로 전송한다
- [ ] 각 answerId당 AssessmentJob은 정확히 1개다(유니크)
