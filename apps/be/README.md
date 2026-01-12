TalkIt 백엔드 - Question Factory (모의 모드)

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

참고

- LLM은 결정적인 JSON 배열을 반환하는 모의 구현을 사용합니다.
- 워커는 Nest `createApplicationContext`만 사용하여 부트스트랩합니다(HTTP 포트 미오픈).

오프라인 검증(빠른 확인)

- Redis/HTTP 없이 로컬 파이프라인을 직접 실행하여 산출물과 건수를 검증합니다.
- 실행: `pnpm verify:mock`
- 동작: `OS / os.pt.process_vs_thread / v1 / nPerCell=3`로 생성 → `acceptedCount=18` 확인 → `output/question-bank/v1/OS__os.pt.process_vs_thread.jsonl` 존재 확인
