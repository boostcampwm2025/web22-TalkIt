# 평가(Assess) 기능 테스트 가이드

이 문서는 처음 보는 사람도 순서대로 따라 하면 평가 흐름(제출→평가→피드백)을 검증할 수 있도록 작성되었습니다.

## 0. 사전 준비

- 러UNTIME/툴링
  - Node.js 18+, pnpm
  - Docker(로컬 MySQL/Redis 실행용)
- 리포 의존 서비스 기동
  - DB: `pnpm run db:up`
  - Redis: `pnpm run cache:up`
- 서버 실행(워커 포함)
  - Clova 없이 실행(휴리스틱 폴백): `REDIS_URL=redis://127.0.0.1:6379 pnpm run dev`
  - Clova 사용 시(선택): `.env`에 `CLOVA_BASE_URL`, `CLOVA_MODEL`, `CLOVA_API_KEY` 설정 후 동일 실행

## 1. DB 스키마/시드

1. Prisma 코드 생성/마이그레이션

```bash
pnpm prisma generate
pnpm prisma migrate dev -n init_assessment
```

2. 사용자(id=1) 삽입(컨테이너 기준)

```bash
docker exec -it talkit-mysql mysql -uroot -prootpass -e "INSERT INTO talkit.users (id, nickname, created_at, updated_at) VALUES (1, 'local', NOW(), NOW()) ON DUPLICATE KEY UPDATE nickname='local', updated_at=NOW()"
```

3. 질문 데이터 Import(로컬 JSONL)

```bash
pnpm run script:import -- -source local -path ./resource
```

(옵션) 질문 풀 워밍업

```bash
pnpm run script:warmup
```

## 2. 세션 생성 → 평가 제출 → 진행 스트림 → 스냅샷

1. 세션 생성

```bash
curl -X POST http://localhost:3000/api/learning/sessions \
  -H 'Content-Type: application/json' \
  -d '{"category":"OS","difficulty":"EASY"}'
```

응답 예: `{"sessionId":2, ... , "question": {"questionId": 538, ...}}`

2. 평가 제출

```bash
curl -X POST http://localhost:3000/api/learning/sessions/2/assess \
  -H 'Content-Type: application/json' \
  -d '{"questionId":538,"answerText":"예시 답변","timeSpentSec":42}'
```

응답 예: `{"jobId":2, "answerId":2, "status":"QUEUED"}`

3. 진행 스트림(SSE)

```bash
curl -N http://localhost:3000/api/learning/answers/2/assess/stream
```

- 로컬 모킹/짧은 평가에서는 매우 빠르게 DONE만 보일 수 있습니다.

4. 스냅샷(결과)

```bash
curl http://localhost:3000/api/learning/answers/2/assess
```

- 예: `{"jobId":2,"answerId":2,"status":"DONE","result":{"score":81,"feedback":{"accurate":[...],"improvement":[...],"keywords":[...]}}}`

## 3. Clova 연동(선택)

- `.env` 설정 예

```
CLOVA_BASE_URL=https://clovastudio.ntruss.com
CLOVA_MODEL=HCX-007
CLOVA_API_KEY=xxxxx
```

- 실행: `REDIS_URL=redis://127.0.0.1:6379 pnpm run dev`
- 기대: EVALUATING 단계에서 LLM 이슈 JSON, FEEDBACKING 단계에서 LLM 피드백 JSON이 생성됩니다.
- 실패 시: 자동으로 휴리스틱(키워드 매칭 기반)으로 폴백합니다.

## 4. 검증 포인트

- 제출: 202 응답, `answerId`/`jobId` 수신
- 워커: EVALUATING→FEEDBACKING→REWARDING→DONE 상태 전이(SSE)
- 스냅샷: `result.score`(0~100)와 `result.feedback`(accurate/improvement/keywords) 확인
- DB: `user_answers.overall_score`, `user_answers.feedback_json` 값 반영
- 덤프(JSONL): `resource/eval_dumps/evaluations.jsonl`에서 해당 answerId 라인을 열어
  - `issues`가 타입별 그룹(strength/misconception/missing/unclear/wrong-example)으로 기록되는지
  - `missing`이 "접근 권한 비트 누락", "변조 비트 누락"처럼 항목별로 분리되어 있는지
  - `meta.mustIncludeMatched/mustIncludeMissing` 및 `score`가 의도대로 반영되는지 확인

## 5. 문제 해결

- P2003(FK 오류): users.id=1 레코드 삽입 필요(위 SQL 사용)
- Drift 감지: `pnpm prisma migrate dev` 프롬프트 Yes로 리셋 후 시딩 재실행
- BullMQ 오류: `maxRetriesPerRequest must be null` → 이미 설정됨(assessment.module.ts)
- JobId 오류: `Custom Id cannot contain :` → 이미 `answer-{id}`로 변경

## 6. 유닛 테스트/스모크 실행(선택)

- 유닛(점수 산식)
  - 파일: `src/modules/assessment/evaluation/domain/scoring.service.spec.ts`
  - 실행: `pnpm test -- src/modules/assessment/evaluation/domain/scoring.service.spec.ts`
- 스모크(오케스트레이터)
  - 파일: `src/modules/assessment/evaluation/application/evaluation.orchestrator.spec.ts`
  - 실행: `pnpm test -- src/modules/assessment/evaluation/application/evaluation.orchestrator.spec.ts`

## 7. 추가 시나리오

- 중복 제출: 동일 answerId는 UNIQUE, 같은 sessionId/questionId 중복 방지 정책(선택)은 추후 추가 가능
- 재연결: 스냅샷으로 현 상태 확인 후 SSE 재구독
- 권한: 현재 데모는 userId=1 고정. 인증 연동 후 소유권 검사 필요

## 8. 기대 결과 요약

- DONE 시 스냅샷에서 score와 feedback(정확한 개념 설명/보완하면 좋을 점/키워드 추천)을 확인할 수 있습니다.
- Clova 설정 시 더 자연스러운 문장/판정이 제공되며, 미설정 시에도 휴리스틱으로 최소 기능이 동작합니다.
