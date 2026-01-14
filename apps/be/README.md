TalkIt 백엔드 - Question Factory (Mock/Real LLM)

개요

다음 항목을 로컬에서 실행 가능한 Mock LLM으로 구현해
Step 1 블루프린트 생성 파이프라인을 엔드 투 엔드로 완성:

- 커리큘럼 로드(v1.2)
- 배치 프롬프트 빌드
- Mock LLM이 JSON 배열 반환
- 파싱 → 검증 → 중복 제거 → JSONL 내보내기
- 워커 잡 + 관리자 API(작업 등록/상태 조회)

블루프린트 생성을 위해 Mock LLM을 실제 네이버 클로바 스튜디오 연동으로 교체.
기존 파이프라인(프롬프트 → 파싱 → 검증 → 중복 제거 → 내보내기)은 변경하지 않음.

- 워커 프로세스는 HTTP 포트를 열지 않고 BullMQ 큐의 작업만 처리합니다.

사전 준비

- Redis 실행 (Docker Desktop 실행 - `docker run -d --name talkit-redis -p 6379:6379 redis:7-alpine`)
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

Term 모드(새 기능) 확인

- 목적: Topic 기반과 동일 파이프라인으로 Term 기반 시드도 생성 가능해야 함.
- 단일 Term(예: QUIC) 생성
  - 워커 실행: `pnpm worker` (HTTP 미오픈)
  - API 서버 실행: `pnpm dev`
  - 등록(예시, QUIC 9개):
    ```bash
    curl -X POST http://localhost:3000/admin/question-gen \
      -H 'Content-Type: application/json' \
      -d '{
        "mode":"term",
        "domain":"Network",
        "conceptLevel":"Advanced",
        "term":"QUIC",
        "version":"v1",
        "count":9
      }'
    ```
  - 기대 파일: `output/question-bank/v1/term/Network__term__Advanced__quic.jsonl`
  - 상태 조회: `GET /admin/question-gen/:jobId` → 완료 상태와 `outputPath` 포함
- 배치 Term(여러 개) 생성
  - 요청 바디(예: Advanced 레벨에서 앞에서부터 3개 term 선택):
    ```json
    { "mode": "term", "domain": "Network", "conceptLevel": "Advanced", "version": "v1", "count": 3 }
    ```
  - 결과: 지정 도메인/레벨의 상위 3개 term에 대해 각기 1개씩 파일 생성, 응답에 `outputPaths` 배열 포함
  - 항목 수: 기본적으로 term 모드는 depth=Low 고정이며, `count`는 항목(문항) 수로 동작합니다. 배치 모드에서는 항목 수는 `itemsPerTerm`(없으면 5)로 처리됩니다.

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

실제 LLM 검증(Topic/Term 공통)

- .env에 Clova 설정(CLOVA_BASE_URL, CLOVA_MODEL, CLOVA_API_KEY)과 `LLM_MODE=real`을 지정합니다.
- 워커 실행: `pnpm worker` (HTTP 미오픈)
- API 실행: `pnpm dev`
- Topic 예시 요청은 상단 “작업 등록” 예시와 동일합니다.
- Term 예시 요청은 상단 “Term 모드(새 기능) 확인”의 cURL을 사용합니다.
- 생성 결과는 동일한 출력 경로 규칙을 따릅니다.

오프라인 검증(빠른 확인)

- Redis/HTTP 없이 로컬 파이프라인을 직접 실행하여 산출물과 건수를 검증합니다.
- Topic: `pnpm verify:mock` → `OS / os.pt.process_vs_thread / v1 / nPerCell=3` 생성 → `acceptedCount=18` 및 파일 존재 확인
- Term: `pnpm verify:term` → `OS / term:Process / Basic / v1 / count=9` 생성 → `acceptedCount=9` 및 `output/question-bank/v1/term/OS__term__Basic__process.jsonl` 존재 확인

실제 LLM 연동 빠른 확인

- 실행: `pnpm verify:llm` (실행 전에 .env에 Clova 설정과 `LLM_MODE=real` 설정 필요)
- 버전/셀 크기 변경 예: `QF_VERSION=v2 QF_N_PER_CELL=10 pnpm verify:llm`

---

### 질문 생성 자동화

대량 생성 (전체 도메인 일괄)

- 목적: curriculum.v1.2.json의 모든 도메인에 대해 자동으로 질문 생성 작업을 큐에 등록합니다.
- 제외: `os.pt.process_vs_thread`는 기존 파일을 그대로 사용하기 위해 자동 등록에서 제외됩니다.
- 준비
  - 워커: `pnpm worker` (여러 개 띄우면 병렬 처리)
  - API: `pnpm dev` (상태 조회 등 필요 시)
  - .env 권장 값(예시):
    - `LLM_MODE=real`, `CLOVA_BASE_URL`, `CLOVA_MODEL`, `CLOVA_API_KEY`
    - `LLM_MAX_TOKENS=2500`, `LLM_TEMPERATURE=0.1~0.2`, `LLM_TIMEOUT_MS=20000~45000`
    - `QF_CHUNK_SIZE=5~10`, `QF_MAX_CALLS_PER_CELL=8~20`, `QF_OVERGEN_FACTOR=1.2~1.5`
    - 누적 저장: `QF_EXPORT_MODE=append|merge`, `QF_SEED_EXISTING=true`
- 실행
  - `pnpm enqueue:all` (기본 v1)
  - 다른 버전/셀 크기 예: `QF_VERSION=v2 QF_N_PER_CELL=10 pnpm enqueue:all`
  - 스크립트는 모든 도메인(OS/Network/DB/Data_Structure)의 `id`를 읽어 큐에 등록합니다(제외 항목은 스킵).
  - 확인
  - 워커 로그: `qf_cell_request`, `qf_cell_received`, `qf_cell_incomplete`, `qf_pipeline_stats`
  - 개별 작업 상태: `GET /admin/question-gen/:jobId`

Export 모드 및 시딩

- `QF_EXPORT_MODE`
  - `overwrite`: 기존 파일을 덮어쓰기(기본)
  - `append`: 기존 파일 뒤에 Accepted만 추가 기록(빠른 누적)
  - `merge`: 기존+신규를 합쳐 지문 핑거프린트 기준으로 재중복 제거 후 저장(정기 정리)
- `QF_SEED_EXISTING`
  - true일 때 실행 시작 시 기존 JSONL을 읽어 Deduplicator에 시딩합니다.
  - 효과: 실행 간(이전 생성분 포함) 중복/유사도까지 차단

---

정의/이해 전용 커리큘럼(v1.3)

- 목적: “~란 무엇인가요?” 류의 정의/이해형 질문 전용 산출을 쉽게 하기 위해 기본 추천 깊이를 `Low`, 레벨을 `Basic`으로 고정한 커리큘럼을 제공합니다.
- 파일: `resources/curriculum/curriculum.v1.3.json`
- 사용 방법
  - 환경변수로 커리큘럼 버전/경로 지정
    - 버전 지정: `QF_CURRICULUM_VERSION=v1.3`
    - 경로 지정(직접 파일 경로): `QF_CURRICULUM_PATH=resources/curriculum/curriculum.v1.3.json`
  - Low/Basic 추가 강제(선택): `QF_FORCE_QUESTION_DEPTHS=Low QF_FORCE_CONCEPT_LEVELS=Basic`
- 포함 토픽 예시
  - OS: Process, Thread, Context Switching, System Call(User/Kernel), Interrupt, Race Condition, Mutex, Virtual Memory, Page Fault
  - DB: Transaction, ACID, Lock, Isolation Level, MVCC, Index, B-Tree Index, Join, WAL, Replication
  - Data_Structure: Array, Linked List, Stack, Queue, Hash Table, Collision, BST, Heap, Graph, Big-O
  - Network: OSI, Encapsulation, MTU, TCP, UDP, Handshake, DNS, NAT, HTTP, TLS

실행 예시(Mock/Real 공통)

```bash
# 정의 전용 커리큘럼 사용
QF_CURRICULUM_VERSION=v1.3 pnpm worker
pnpm dev

# 필요 시 Low/Basic 강제
QF_FORCE_QUESTION_DEPTHS=Low QF_FORCE_CONCEPT_LEVELS=Basic pnpm worker
```

- Term(LLM) 검증

- .env에 Clova 설정(CLOVA_BASE_URL, CLOVA_MODEL, CLOVA_API_KEY) 지정 후 `LLM_MODE=real` 설정
- 실행: `pnpm verify:term:llm`
- append로 실행: `pnpm verify:term:llm:append` (기존 파일 뒤에 추가 기록)
- 동작: `OS / term:Process / Basic / v1 / count=9`를 실 LLM으로 생성 → `output/question-bank/v1/term/OS__term__Basic__process.jsonl` 존재 확인(실 LLM은 개수 보장이 어려워 파일 존재만 검증)
