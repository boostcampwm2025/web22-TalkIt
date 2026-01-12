TalkIt 백엔드 - Question Factory (Mock/Real LLM)

개요

- AGENT.md의 "THIS TASK" 범위를 모의(Mock) LLM으로 구현했습니다.
- 워커 프로세스는 HTTP 포트를 열지 않고 BullMQ 큐의 작업만 처리합니다.

사전 준비

- Redis 실행 (Docker Desktop 실행 - `docker run --name talkit-redis -p 6379:6379 -d redis:7-alpine`)
  (기본: `redis://127.0.0.1:6379`)
- 의존성 설치: `pnpm install`

실행 방법 (Mock 모드)

- 터미널 A(워커 전용, HTTP 미오픈): `pnpm worker`
- 터미널 B(API 서버): `pnpm dev`

작업 등록 (enqueue)

```
curl -X POST http://localhost:3000/admin/question-gen \
  -H 'Content-Type: application/json' \
  -d '{"domain":"OS","topicId":"os.pt.process_vs_thread","version":"v1","nPerCell":3}'
```

상태 조회 (jobId 교체)

```
curl http://localhost:3000/admin/question-gen/<jobId>
```

출력 결과

- 파일 경로: `output/question-bank/v1/OS__os.pt.process_vs_thread.jsonl`
- 수락된 블루프린트 개수(예시): 18개 (허용 ConceptLevel 2 × Depth 3 × nPerCell 3)

환경 변수

- `REDIS_URL`: Redis 연결 문자열(선택, 기본값은 `redis://127.0.0.1:6379`)
- `QF_OVERGEN_FACTOR`: 과생성 배수(기본 1). 실제 LLM에서 검증/중복 제거로 수량이 줄어들 경우 보정용으로 셀당 요청 갯수를 늘립니다.

참고

- LLM은 결정적인 JSON 배열을 반환하는 모의 구현을 사용합니다.
- 워커는 Nest `createApplicationContext`만 사용하여 부트스트랩합니다(HTTP 포트 미오픈).

실행 방법 (Real LLM - Clova Studio)

- .env 설정
  - `CLOVA_BASE_URL` (예: https://clovastudio.stream.ntruss.com)
  - `CLOVA_MODEL` (예: HCX-007)
  - `CLOVA_API_KEY`
  - `LLM_MODE=real`
  - 선택: `LLM_MAX_TOKENS`(기본 1500, 상한 2500), `LLM_TEMPERATURE`(기본 0.2), `LLM_TIMEOUT_MS`(기본 45000)
- 실행
  - 터미널 A(워커): `pnpm worker`
  - 터미널 B(API 서버): `pnpm dev`
- 주의
  - 로그에는 키/프롬프트 원문을 남기지 않고 길이와 소요 시간, 토큰(제공 시)만 남깁니다.
  - LLM 응답이 유효 JSON 배열이 아니면 1회 JSON-수정 재요청을 수행합니다(여전히 실패 시 작업 실패).

오프라인 검증(빠른 확인)

- Redis/HTTP 없이 로컬 파이프라인을 직접 실행하여 산출물과 건수를 검증합니다.
- 실행: `pnpm verify:mock`
- 동작: `OS / os.pt.process_vs_thread / v1 / nPerCell=3`로 생성 → `acceptedCount=18` 확인 → `output/question-bank/v1/OS__os.pt.process_vs_thread.jsonl` 존재 확인

실제 LLM 연동 빠른 확인

- 실행: `pnpm verify:llm` (실행 전에 .env에 Clova 설정과 `LLM_MODE=real` 설정 필요)
