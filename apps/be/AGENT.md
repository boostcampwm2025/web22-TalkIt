# AGENT.md — Question Provider Module (NestJS)

## Overview

### Goals

- 질문은행 원본 파일(`os_terms_questions.jsonl`)을 **NCloud Object Storage 제품 버킷**에 업로드하는 기능 제공
  - 구현 방식: `@aws-sdk/client-s3` 기반 `ObjectStorageProvider`(NestJS Injectable) 사용
- 질문은행 원본(JSONL)을 **MySQL(RDB)** 에 적재(import/seed)하는 스크립트 제공 (Prisma 사용)
- import 완료 후 **Redis warm-up 배치**로 `domain:difficulty`별 질문 ID 풀(SET) 생성
- 런타임 API `POST /questions/pick`:
  - Redis SET에서 랜덤 ID를 뽑고
  - RDB에서 해당 질문 1개를 조회해 반환
  - **응답에 `guide`는 포함하지 않음**
- “중복 질문 방지/유저 이력 고려”는 **지금 구현하지 않되**, 나중에 큰 변경 없이 추가될 수 있도록 **확장 포인트(옵션/전략)** 설계를 포함

### Non-goals

- 학습 세션 생성/상태/진행 저장
- 사용자 답변 저장/채점/평가
- Admin UI
- 런타임에서 Object Storage로 질문 서빙 (금지)

---

## Architecture Constraints

### 런타임 요청 경로는 가볍게 유지

- `pick` API는 worker 사용하지 않음
- 요청당 수행: `Redis SRANDMEMBER` + `DB 1 row 조회`만 수행

### 무거운 작업은 scripts로 분리

- JSONL 파싱 + 대량 upsert + Redis warm-up 은 HTTP 요청 경로에서 실행 금지
- 반드시 `scripts/`로 분리하여 CLI로 실행

### 재사용성 정의(구체화)

- DB 접근(Prisma)과 Redis 접근은 **인터페이스(포트) + 구현체(어댑터)** 로 분리
- 질문 선택 로직은 **전략 패턴**으로 확장 가능하게(기본 random만 구현)
- 컨트롤러(DTO) ↔ 서비스(도메인) ↔ 인프라(Prisma/Redis) 경계를 유지

### 주석 정책

- **모듈/클래스/핵심 메서드**에 한글로 “계약/의도” 주석 작성
- 함수 내부 구현 주석은 최소화

---

## Object Storage (NCloud) — Provider 구현 기준

### ObjectStorageProvider (기준 코드 스타일)

- `@aws-sdk/client-s3`의 `S3Client`, `PutObjectCommand`를 사용
- endpoint: `https://kr.object.ncloudstorage.com`
- region: `kr-standard`
- Config key:
  - `OBJECT_STORAGE_BUCKET_NAME`
  - `NCP_ACCESS_KEY_ID`
  - `NCP_SECRET_ACCESS_KEY`

### 업로드 Key 규칙

- TODO로 남겨둔 “디렉토리 관리”를 이번 구현에서 명확히 결정:
  - 기본 prefix: `questionbank/`
  - 최종 key: `questionbank/os_terms_questions.jsonl` (고정)
- 업로드 대상은 `Express.Multer.File` 또는 로컬 파일(스크립트)이므로:
  - (A) API 기반 업로드: Multer file.buffer 사용
  - (B) 스크립트 기반 업로드: fs stream/buffer 사용
    두 방식 중 **이번 작업은 scripts로 수행하는 방식을 우선**으로 하고, Provider는 재사용 가능하게 유지

---

## Source Data (JSONL)

### 원본 포맷(라인당 1 JSON)

```json
{
  "domain": "OS",
  "topic_id": "Buffer Cache",
  "concept_level": "Advanced",
  "question_depth": "Low",
  "prompt": "OS에서 'Buffer Cache'란 무엇이며 주요 특징은 어떤 것들이 있나요?",
  "intent": "정의 확인",
  "must_include": ["디스크 I/O 성능 향상", "메모리 영역 활용", "데이터 임시 저장"]
}
```

### DB 저장 규칙

- `domain` → DB `domain` (`OS|NETWORK|DB|DATA_STRUCTURE`)
- `concept_level` → DB `difficulty` (`Basic|Intermediate|Advanced`)
- `topic_id` → DB `topicId`
- `prompt` → DB `content`
- `must_include` → DB `mustInclude` (JSON 컬럼)
- `intent`, `question_depth`는 DB에 저장하지 않음
- `timeLimitSec`은 질문별로 저장하지 않고 **고정 180초**

---

## Database (Prisma / MySQL)

### Prisma Model 요구사항

- `id`: BigInt PK autoincrement
- `domain`: Enum(권장) 또는 string
- `difficulty`: Enum(권장) 또는 string
- `topicId`: string
- `content`: text
- `mustInclude`: JSON
- `timeLimitSec`: int default 180
- `createdAt`: datetime default now()

### 인덱스

- `@@index([domain, difficulty])` 필수
- `@@index([domain, difficulty, topicId])` 권장

### 중복 방지(Upsert/Unique)

- 유니크 키: `@@unique([domain, difficulty, topicId, content])`
- import는 upsert로 구현하여 재실행해도 중복 폭발 방지

---

## Redis Cache

### 캐시 키

- 질문 ID 풀: `qpool:{domain}:{difficulty}` (Redis SET)
  - 예: `qpool:OS:Advanced`

### Warm-up 정책

- import 완료 후 배치에서:
  - `DEL qpool:*` 후 재생성(단순/안전)
  - 모든 `domain:difficulty` 조합에 대해 DB에서 ID 전부 조회
  - 대량 `SADD`는 chunk(예: 5k~20k)로 나눠 수행

---

## Runtime API Contract

### Endpoint

- `POST /questions/pick`

### Request DTO

```json
{
  "domain": "OS",
  "difficulty": "Advanced"
}
```

### Response DTO (guide 없음)

```json
{
  "questionId": 123,
  "domain": "OS",
  "difficulty": "Advanced",
  "topicId": "Buffer Cache",
  "content": "....",
  "mustInclude": ["...", "..."],
  "timeLimitSec": 180
}
```

---

## Extensibility (세션 중복/유저 이력 대비: 지금 구현 X)

### PickOptions (서비스 내부 옵션)

- `excludeQuestionIds?: bigint[]`
- `userId?: string`
- `sessionId?: string`
- `strategy?: "random" | "avoid_seen"` (기본 random만 구현)

### 전략 패턴

- `QuestionPickStrategy` 인터페이스 정의
- `RandomPickStrategy`만 구현
- 추후 `AvoidSeenPickStrategy` 추가 시 컨트롤러/서비스 구조가 크게 바뀌지 않도록 설계

---

## Directory Layout (권장)

```
src/
  modules/
    question-provider/
      question-provider.module.ts

      presentation/
        question-provider.controller.ts
        dto/
          pick-question.request.dto.ts
          pick-question.response.dto.ts

      application/
        question-provider.service.ts
types/
          pick-options.ts

domain/
        models/
          question.model.ts
        strategy/
          question-pick-strategy.ts
          random-pick-strategy.ts

      infra/
        ports/
          question.repository.ts
          question-pool.cache.ts
object-storage.provider.ts
        prisma/
          question.repository.prisma.ts
        redis/
          question-pool.cache.redis.ts
object-storage/
object-storage.provider.impl.ts

scripts/
  upload-questionbank.ts
import-questionbank.ts
  warmup-question-pool.ts

```

> ObjectStorageProvider는 infra/object-storage에 두고, 포트(인터페이스)는 infra/ports로 분리.

---

## Implementation Checklist

### A. Prisma / DB

- [ ] `prisma/schema.prisma`에 `Question` 모델 추가 (JSON mustInclude, timeLimitSec=180 default)
- [ ] unique/index 반영
- [ ] migration 생성/적용
- [ ] enum 정규화:
  - domain: `OS|NETWORK|DB|DATA_STRUCTURE`
  - difficulty: `Basic|Intermediate|Advanced`
- [ ] import에서 원본 값 매핑 실패 시 처리(로그 + 스킵/종료 옵션)

### B. Infra: ObjectStorageProvider 구현

- [ ] 사용자 제공 예시 코드 스타일을 따르는 `ObjectStorageProvider` 구현/정리
- [ ] key 관리 규칙:
  - 기본: `questionbank/os_terms_questions.jsonl` (고정)
- [ ] 업로드 메서드:
  - `upload(bufferOrStream, key, contentType)` 형태로 범용화(재사용성)

### C. Script: Object Storage 업로드

- [ ] `scripts/upload-questionbank.ts`
  - 입력: `-path` (로컬 파일 경로)
  - 동작:
    - fs로 파일 read → ObjectStorageProvider로 업로드
    - Key: `questionbank/os_terms_questions.jsonl`
  - 출력: 업로드된 key, size

### D. Script: Import(JSONL → DB)

- [ ] `scripts/import-questionbank.ts`
  - 입력: `-source local|object`
  - local: `-path`
  - object: Object Storage에서 다운로드(또는 stream) 후 파싱
  - JSONL 스트리밍 파싱(라인 단위)
  - 매핑:
    - domain, difficulty, topicId, content, mustInclude(JSON), timeLimitSec(180)
  - upsert:
    - unique(domain,difficulty,topicId,content) 기준
  - 배치 처리: 500~2000 rows 단위
  - 결과 리포트:
    - 처리 라인 수, insert/update 수, 실패 라인 수(샘플 N개)

### E. Script: Warm-up (Redis qpool 생성)

- [ ] `scripts/warmup-question-pool.ts`
  - `DEL qpool:*` 후 재생성
  - DB에서 domain:difficulty 그룹별 id 전부 조회
  - `SADD qpool:{domain}:{difficulty}` 를 chunk로 수행
  - 결과 로그: 각 풀의 size 출력

### F. Runtime: Question Provider Module

- [ ] ports 정의:
  - `QuestionRepositoryPort`: `findById`, `findIdsByDomainDifficulty` 등
  - `QuestionPoolCachePort`: `getRandomId`, `seedPool`, `exists` 등
- [ ] Prisma repo 구현체
- [ ] Redis cache 구현체
- [ ] `RandomPickStrategy` 구현
- [ ] `QuestionProviderService.pickOne(domain, difficulty, options?)`
  - 흐름:
    - Redis에서 SRANDMEMBER → id
    - id 없으면 명확한 에러(“Question pool not warmed”)
    - DB fetch → 반환 (응답에 guide 없음)
- [ ] Controller + DTO validation(class-validator)
- [ ] Module wiring (providers/export)

### G. Tests (가능하면)

- [ ] 단위 테스트:
  - Redis에서 id를 받으면 DB 1회 조회 후 반환
  - invalid enum 입력 시 400
- [ ] 스크립트 최소 테스트:
  - 샘플 jsonl로 import 성공/중복 upsert 확인
  - warm-up 실행 후 qpool size 확인

---

## Operational Policies

### Warm-up 누락 시 동작

- 런타임에서 qpool이 비어있으면 503 또는 도메인 에러로 반환
- 로그에 warm-up 필요 안내

### Import 매핑 실패

- 기본: 실패 라인 로그 후 스킵 + 최종 실패 카운트 리포트
- 옵션: `-strict`면 즉시 종료

---

## Environment Variables

### DB (Prisma)

- `DATABASE_URL`

### Redis

- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`(필요 시)

### NCloud Object Storage (S3 호환)

- `OBJECT_STORAGE_BUCKET_NAME`
- `NCP_ACCESS_KEY_ID`
- `NCP_SECRET_ACCESS_KEY`
- `NCLOUD_OBJECT_ENDPOINT` (기본값: `https://kr.object.ncloudstorage.com`)

---

## Acceptance Criteria

- [ ] upload 스크립트가 Object Storage에 `questionbank/os_terms_questions.jsonl`을 업로드한다.
- [ ] import 스크립트가 jsonl을 DB에 적재하고, 재실행해도 중복이 폭발하지 않는다(upsert).
- [ ] warm-up 스크립트 실행 후 `qpool:{domain}:{difficulty}`가 생성되고 size가 0이 아니다.
- [ ] `POST /questions/pick`이 Redis에서 id를 뽑아 DB에서 조회한 질문을 반환한다.
- [ ] 응답에 `guide`가 포함되지 않는다.
- [ ] 모듈/클래스/핵심 메서드 한글 주석이 포함되어 있으며, 디렉토리 경계가 유지된다.
- [ ] 확장을 위한 `PickOptions`와 `Strategy` 인터페이스가 존재한다(기본 random만 구현).
