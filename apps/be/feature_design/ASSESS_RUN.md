# 학습 평가 실행/배포 가이드

## 구성요소

- API 서버(NestJS)
- Worker(BullMQ 기반, 동일 프로세스 내 구동)
- Redis(BullMQ Queue + Redis Pub/Sub)
- DB(MySQL, Prisma)

## 환경 변수

- `DATABASE_URL`: MySQL 접속 문자열
- `REDIS_URL`: Redis 연결 URL (예: `redis://127.0.0.1:6379`)
- `ASSESS_WORKER_CONCURRENCY`(선택): 워커 동시성, 기본 2

## 로컬 실행

1. DB/Redis 준비:
   - DB: `pnpm run db:up` (Docker)
   - Redis: `pnpm run cache:up` (Docker)
2. 서버 실행(워커 포함):
   - `REDIS_URL=redis://127.0.0.1:6379 pnpm run dev`
3. Swagger 문서 확인:
   - `http://localhost:3000/api`

## 워커 실행

- 현재 모듈은 BullMQ Worker가 API 프로세스 내에서 자동 구동됩니다.
- 별도 프로세스로 분리할 수도 있으나(추후 옵션), 현재는 단일 프로세스 구조입니다.

## 배포 예시(pm2)

```bash
pm2 start dist/main.js --name talkit-api
```

## 스모크 테스트

- feature_design/TEST.md의 시나리오를 순서대로 수행
