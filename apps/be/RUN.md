# Question Provider 실행/검증 가이드 (Korean)

아래 순서로 의존성 설치 → DB/Prisma 준비 → 데이터 적재 → Redis 워밍업 → API 호출까지 검증합니다. (pnpm 기준)

## 0. 사전 준비물

- Node.js 18+ / npm
- MySQL 접근 가능한 `DATABASE_URL`
- Redis 서버 (로컬 또는 외부)
- (선택) NCloud Object Storage 버킷/키
- (선택) 개발용 MySQL/Redis Docker (이 레포의 compose 파일 사용 가능)

환경변수(.env) 예시:

```
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/talkit"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
OBJECT_STORAGE_BUCKET_NAME=your-bucket
NCP_ACCESS_KEY_ID=AKIA...
NCP_SECRET_ACCESS_KEY=...
NCLOUD_OBJECT_ENDPOINT=https://kr.object.ncloudstorage.com
```

## 1. 의존성 설치 (pnpm)

```
pnpm install
```

핵심 패키지(이미 package.json 반영):

- 런타임: `@prisma/client`, `@aws-sdk/client-s3`, `redis`, `class-validator`, `class-transformer`
- 개발: `prisma`

## 2. Prisma 스키마/마이그레이션 적용 (pnpm)

```
pnpm prisma generate
pnpm prisma migrate dev -n init_question
```

스키마는 `prisma/schema.prisma`에 있으며, AGENT.md 요구사항(모델/인덱스/유니크/기본값)을 반영합니다.

## 3. 원본 업로드(선택, pnpm)

Object Storage에 원본 JSONL을 백업하려면:

```
pnpm run script:upload -- -path ./resource/os_terms_questions.jsonl
```

업로드 키: `questionbank/os_terms_questions.jsonl`

## 4. 데이터 Import(JSONL → DB, pnpm)

로컬 파일에서 직접 import:

```
pnpm run script:import -- -source local -path ./resource/os_terms_questions.jsonl
```

Object Storage에서 읽어 import(버킷/키 환경변수 필요):

```
pnpm run script:import -- -source object
```

결과 로그 예: `lines=1234 inserted=1200 updated=34 failed=0`

## 5. Redis 워밍업(qpool 생성, pnpm)

```
pnpm run script:warmup
```

각 조합별 로그 예: `qpool:OS:Advanced size+=N (total M)`

## 6. 서버 실행 및 API 검증 (pnpm)

```
pnpm run dev
```

요청:

```
curl -X POST http://localhost:3000/questions/pick \
 -H "Content-Type: application/json" \
 -d '{"domain":"OS","difficulty":"Advanced"}'
```

기대 응답(guide 없음):

```
{
  "questionId": "123",
  "domain": "OS",
  "difficulty": "Advanced",
  "topicId": "Buffer Cache",
  "content": "...",
  "mustInclude": ["..."],
  "timeLimitSec": 180
}
```

503(Service Unavailable)이면 Redis 풀 미워밍 또는 Redis 연결 문제 가능성이 큽니다.

## 7. 유효성 검사(ValidationPipe)

`src/main.ts`에 글로벌 `ValidationPipe`가 설정되어 있습니다. 잘못된 enum을 보내면 400이 반환됩니다.

예: `domain: "INVALID"` → 400 Bad Request

## 8. 재실행/중복 검증

- Import 스크립트는 upsert로 동작하여 재실행해도 중복이 폭발하지 않습니다.
- Warm-up은 필요 시 재실행해 Redis SET을 재구성할 수 있습니다.

## 문제 해결 팁

- DB 연결 오류: `DATABASE_URL` 확인, `npx prisma migrate dev` 재시도.
- Redis 오류: Redis 서버 동작 여부 확인(포트, 비밀번호), `.env`의 `REDIS_*` 재확인.
- Object Storage 오류: 버킷/키/자격 증명, 엔드포인트(`NCLOUD_OBJECT_ENDPOINT`) 확인.
- Docker MySQL 관련:
  - 컨테이너 기동: `pnpm run db:up`
  - 종료/삭제: `pnpm run db:down`
  - 로그 확인: `pnpm run db:logs`
  - 접속 예시: `mysql -h 127.0.0.1 -P 3307 -u root -prootpass talkit`

- Docker Redis 관련:
  - 컨테이너 기동: `pnpm run cache:up`
  - 종료/삭제: `pnpm run cache:down`
  - 로그 확인: `pnpm run cache:logs`
  - 상태 확인: `docker exec -it talkit-redis redis-cli ping` (PONG이면 정상)
  - .env 기본값: `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`

---

## 부록: 개발용 Docker(MySQL) 사용 가이드

이 레포에는 개발 편의를 위한 MySQL Docker Compose 설정이 포함되어 있습니다.

- 파일: `docker/docker-compose.mysql.yml`
- 기본 설정:
  - 이미지: `mysql:8.0`
  - 루트 패스워드: `rootpass`
  - 기본 DB: `talkit`
  - 포트: 호스트 `3307` → 컨테이너 `3306`
  - 데이터 경로: `docker/mysql-data` (Git ignore 처리)

1. 기동

```
pnpm run db:up
```

2. DATABASE_URL 설정 예시(.env)

```
DATABASE_URL="mysql://root:rootpass@127.0.0.1:3307/talkit"
```

3. Prisma 적용/데이터 적재/워밍업/서버 실행은 본문 2~6단계와 동일하게 진행합니다.

4. 중지/삭제/로그

```
pnpm run db:down
pnpm run db:logs
```

## 부록: 개발용 Docker(Redis) 사용 가이드

- 파일: `docker/docker-compose.redis.yml`
- 기본 설정:
  - 이미지: `redis:7-alpine`
  - 포트: 호스트 `6379` → 컨테이너 `6379`
  - 데이터 경로: `docker/redis-data` (Git ignore 처리)

1. 기동

```
pnpm run cache:up
```

2. 연결 확인

```
docker exec -it talkit-redis redis-cli ping  # PONG
```

3. .env 설정 확인

```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

4. 중지/삭제/로그

```
pnpm run cache:down
pnpm run cache:logs
```
