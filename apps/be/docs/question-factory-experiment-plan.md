# Question Factory 실험 계획서

> **베이스 브랜치**: `question-factory`
> **목표**: 6가지 질문 생성 방안을 각각 브랜치로 분리하여 실험하고, 결과를 비교한다.

---

## 전체 구조

### 브랜치 전략

```
question-factory (베이스 - 공통 인프라)
├── qf/approach-1  (도메인만 전달)
├── qf/approach-2  (용어 목록 + LLM 자율 난이도)
├── qf/approach-3  (용어 + 개념 난이도 전달)
├── qf/approach-4  (용어 + 개념 난이도 + 난이도 기준 전달)
├── qf/approach-5  (교과서/커리큘럼 기반)
└── qf/approach-6  (Bloom's Taxonomy 기반)
```

모든 브랜치는 `question-factory`에서 분기한다.
각 브랜치에서는 `prompt.builder.ts`와 `generate.script.ts`를 해당 방안에 맞게 수정한다.

### 파일 저장 규칙

```
output/question-bank/
├── approach-1/
│   ├── OS-20260129-153000-draft.json       ← 1차 생성 결과
│   └── OS-20260129-153000-final.json       ← Bloom's 검증 후 결과
├── approach-2/
│   ├── OS-20260129-160000-draft.json
│   └── OS-20260129-160000-final.json
├── ...
└── approach-6/
    └── OS-20260129-180000-final.json       ← 처음부터 Bloom's 기반이므로 final만
```

- **파일명**: `{domain}-{yyyyMMdd-HHmmss}-{draft|final}.json`
- **draft**: 해당 방안의 1차 생성 결과
- **final**: 방안 6(Bloom's Taxonomy) 검증을 통과한 최종 결과
- **approach-6**은 처음부터 Bloom's 기반이므로 final만 생성

---

## 방안별 상세

### 방안 1: 도메인만 전달

LLM에게 도메인(OS, Network 등)만 주고, 어떤 주제를 어떤 난이도로 만들지 전부 자율에 맡긴다.

**브랜치**: `qf/approach-1`

**LLM에게 전달하는 정보**:

- 도메인 (예: OS)
- 생성할 질문 개수
- 출력 JSON 포맷

**LLM이 자율 결정하는 것**:

- 어떤 주제/용어를 다룰지
- 난이도 (Basic/Intermediate/Advanced)
- 질문 깊이 (Low/Mid/High)

**작업 목록**:

1. `prompt.builder.ts` — 도메인만 받는 프롬프트 작성
2. `generate.script.ts` — approach-1 폴더에 draft로 저장
3. 실행 및 결과 확인
4. Bloom's 검증 프롬프트 추가 (draft → final)

**커밋 계획**:

```
feat: approach-1 도메인 기반 자유 생성 프롬프트 구현
feat: approach-1 Bloom's 검증 단계 추가 (draft → final)
docs: approach-1 실험 결과 기록
```

---

### 방안 2: 용어 목록 + LLM 자율 난이도

미리 정의한 용어 목록을 전달하고, 각 용어에 대해 LLM이 난이도를 자율 판단하여 질문을 생성한다.

**브랜치**: `qf/approach-2`

**LLM에게 전달하는 정보**:

- 도메인
- 용어 (예: "Process", "Thread", "Deadlock")
- 생성할 질문 개수
- 출력 JSON 포맷

**LLM이 자율 결정하는 것**:

- 난이도 (Basic/Intermediate/Advanced)
- 질문 깊이 (Low/Mid/High)

**작업 목록**:

1. 도메인별 용어 목록 JSON 파일 작성 (또는 기존 term_curriculum 활용)
2. `prompt.builder.ts` — 용어를 포함한 프롬프트 작성
3. `generate.script.ts` — 용어 목록 순회하며 생성, approach-2 폴더에 저장
4. Bloom's 검증 단계 추가

**커밋 계획**:

```
feat: approach-2 용어 목록 데이터 추가
feat: approach-2 용어 기반 자율 난이도 프롬프트 구현
feat: approach-2 Bloom's 검증 단계 추가 (draft → final)
docs: approach-2 실험 결과 기록
```

---

### 방안 3: 용어 + 개념 난이도 전달

용어와 함께 해당 용어의 개념 난이도(Basic/Intermediate/Advanced)를 명시하여 전달한다.

**브랜치**: `qf/approach-3`

**LLM에게 전달하는 정보**:

- 도메인
- 용어
- 개념 난이도 (Basic/Intermediate/Advanced)
- 생성할 질문 개수
- 출력 JSON 포맷

**LLM이 자율 결정하는 것**:

- 질문 깊이 (Low/Mid/High)
- 질문의 구체적 내용

**작업 목록**:

1. 용어별 개념 난이도가 포함된 데이터 구성 (기존 term_curriculum 구조 활용)
2. `prompt.builder.ts` — 용어 + 개념 난이도 프롬프트 작성
3. `generate.script.ts` — 난이도별 용어 순회, approach-3 폴더에 저장
4. Bloom's 검증 단계 추가

**커밋 계획**:

```
feat: approach-3 용어별 난이도 데이터 구성
feat: approach-3 용어 + 개념 난이도 프롬프트 구현
feat: approach-3 Bloom's 검증 단계 추가 (draft → final)
docs: approach-3 실험 결과 기록
```

---

### 방안 4: 용어 + 개념 난이도 + 난이도 기준 전달

방안 3에 더해, 각 난이도가 구체적으로 무엇을 의미하는지 기준을 프롬프트에 포함한다.

**브랜치**: `qf/approach-4`

**LLM에게 전달하는 정보**:

- 도메인
- 용어
- 개념 난이도
- **난이도 기준 정의** (예: Basic = "단일 개념 정의를 묻는 질문", Intermediate = "2~3개 개념 관계를 묻는 질문" 등)
- **질문 깊이 기준** (예: Low = "정의/목적을 묻는다", Mid = "동작 원리/비교를 묻는다", High = "설계 판단/트레이드오프를 묻는다")
- 생성할 질문 개수
- 출력 JSON 포맷

**LLM이 자율 결정하는 것**:

- 질문의 구체적 내용

**작업 목록**:

1. 난이도 기준 텍스트 정의 작성
2. `prompt.builder.ts` — 용어 + 난이도 + 기준 정의를 포함한 프롬프트 작성
3. `generate.script.ts` — approach-4 폴더에 저장
4. Bloom's 검증 단계 추가

**커밋 계획**:

```
feat: approach-4 난이도 기준 정의 작성
feat: approach-4 용어 + 기준 포함 프롬프트 구현
feat: approach-4 Bloom's 검증 단계 추가 (draft → final)
docs: approach-4 실험 결과 기록
```

---

### 방안 5: 교과서/커리큘럼 기반

CS 교과서 목차 구조를 프롬프트에 포함하여, 해당 챕터 범위의 질문을 생성한다.

**브랜치**: `qf/approach-5`

**LLM에게 전달하는 정보**:

- 도메인
- **챕터/섹션 구조** (예: "OS - 5장 CPU 스케줄링: FCFS, SJF, RR, Priority, Multilevel Queue")
- 해당 섹션에서 다루는 핵심 개념 목록
- 생성할 질문 개수
- 출력 JSON 포맷

**LLM이 자율 결정하는 것**:

- 난이도, 깊이, 구체적 질문 내용

**작업 목록**:

1. 도메인별 교과서 목차 데이터 작성 (OS: 공룡책 기준, Network: 탑다운 기준 등)
2. `prompt.builder.ts` — 챕터 구조를 포함한 프롬프트 작성
3. `generate.script.ts` — 챕터별 순회, approach-5 폴더에 저장
4. Bloom's 검증 단계 추가

**커밋 계획**:

```
feat: approach-5 도메인별 교과서 목차 데이터 작성
feat: approach-5 교과서 기반 프롬프트 구현
feat: approach-5 Bloom's 검증 단계 추가 (draft → final)
docs: approach-5 실험 결과 기록
```

---

### 방안 6: Bloom's Taxonomy 기반

처음부터 Bloom's Taxonomy 인지 수준을 기반으로 질문을 생성한다.
이 방안은 단독 생성 방안이자, 방안 1~5의 검증 단계로도 사용된다.

**브랜치**: `qf/approach-6`

**Bloom's Taxonomy 매핑**:

| 인지 수준         | 설명                           | 질문 패턴 예시                            |
| ----------------- | ------------------------------ | ----------------------------------------- |
| 기억 (Remember)   | 사실/용어를 떠올림             | "~란 무엇인가요?"                         |
| 이해 (Understand) | 개념을 자기 말로 설명          | "~를 설명해주세요", "~의 목적은?"         |
| 적용 (Apply)      | 개념을 새로운 상황에 사용      | "~상황에서 어떻게 적용하나요?"            |
| 분석 (Analyze)    | 구성 요소를 분해하고 관계 파악 | "~와 ~의 차이점은?", "~의 원인은?"        |
| 평가 (Evaluate)   | 기준에 따라 판단               | "~보다 ~가 나은 이유는?", "~의 장단점은?" |
| 창조 (Create)     | 새로운 것을 설계/제안          | "~를 설계한다면?", "~를 개선한다면?"      |

**난이도 매핑**:

- **Basic**: 기억 + 이해
- **Intermediate**: 적용 + 분석
- **Advanced**: 평가 + 창조

**LLM에게 전달하는 정보**:

- 도메인
- 용어/주제
- Bloom's 인지 수준 (위 6단계 중 지정)
- 해당 수준의 질문 패턴 예시
- 생성할 질문 개수

**작업 목록**:

1. Bloom's Taxonomy 매핑 데이터 작성
2. `prompt.builder.ts` — Bloom's 수준별 프롬프트 작성
3. `generate.script.ts` — 인지 수준별 순회, approach-6 폴더에 저장
4. **검증용 프롬프트 작성** — 방안 1~5의 draft를 입력받아 Bloom's 기준으로 재평가하는 프롬프트
5. 검증 스크립트 작성 (draft.json → final.json 변환)

**커밋 계획**:

```
feat: approach-6 Bloom's Taxonomy 매핑 데이터 작성
feat: approach-6 Bloom's 기반 생성 프롬프트 구현
feat: approach-6 검증 프롬프트 및 draft→final 변환 스크립트 구현
docs: approach-6 실험 결과 기록
```

---

## 작업 순서

```
1. question-factory 브랜치에서 공통 인프라 완성 (현재 완료)
   ├── question-factory.module.ts
   ├── question-factory.service.ts
   ├── prompt.builder.ts
   ├── generate.script.ts
   └── types.ts

2. question-factory/approach-6 먼저 구현 (검증 프롬프트가 다른 방안에서도 필요)

3. question-factory/approach-1 ~ approach-5 순서대로 구현
   각 브랜치에서:
   a. 프롬프트 수정 → draft 생성
   b. approach-6의 검증 프롬프트 적용 → final 생성
   c. 결과 비교 기록

4. 전체 결과 비교 문서 작성
```

---

## 실행 방법

각 브랜치 체크아웃 후 동일한 명령어로 실행:

```bash
cd apps/be

# 기본 실행
pnpm generate:questions

# 옵션 지정
QF_DOMAIN=OS QF_COUNT=5 pnpm generate:questions
QF_DOMAIN=Network QF_TERM=TCP QF_COUNT=3 pnpm generate:questions
```

---

## 비교 실험 방식 (OS 도메인 기준)

### 실험 개요

OS 도메인을 기준으로 6가지 방안의 질문 생성 품질을 비교한다.
각 방안별로 동일한 조건(30개 질문)으로 생성한 뒤, 자동 비교 스크립트 + 수동 샘플링으로 평가한다.

### 1단계: 대량 생성

각 approach 브랜치에서 OS 도메인에 대해 **난이도 3개 × 10개 = 30개**씩 생성한다.

```bash
cd apps/be
QF_BULK=true QF_COUNT=10 QF_DOMAIN=OS pnpm generate:questions
```

이 명령은 Basic 10개, Intermediate 10개, Advanced 10개를 순차 생성하여
`output/question-bank/{approach}/` 폴더에 저장한다.

**생성 결과 파일 구조**:

```
output/question-bank/
├── approach-1/
│   ├── OS-Basic-{datetime}-draft.json        (10개)
│   ├── OS-Intermediate-{datetime}-draft.json (10개)
│   └── OS-Advanced-{datetime}-draft.json     (10개)
├── approach-2/
│   └── ...
├── ...
└── approach-6/
    ├── OS-Basic-{datetime}-final.json        (approach-6은 final만)
    ├── OS-Intermediate-{datetime}-final.json
    └── OS-Advanced-{datetime}-final.json
```

### 2단계: 자동 비교 스크립트

`compare-report.script.ts`를 실행하여 전 approach의 결과를 자동 분석한다.

```bash
pnpm compare:questions
```

**자동 비교 항목**:

| 항목                    | 측정 방법                           | 비교 포인트                                       |
| ----------------------- | ----------------------------------- | ------------------------------------------------- |
| **질문 수**             | 파일별 questions 배열 길이 합산     | 요청 수(30) 대비 실제 생성 수                     |
| **난이도 분포**         | concept_level별 카운트              | Basic:Intermediate:Advanced = 10:10:10에 가까운가 |
| **Bloom's 수준 분포**   | bloom_level별 카운트                | 6단계가 골고루 분포되는가                         |
| **토픽 커버리지**       | topic_id의 고유 값 수               | OS의 주요 토픽을 얼마나 다양하게 다루는가         |
| **중복 쌍**             | Jaccard 유사도 >= 0.7인 질문 쌍 수  | 낮을수록 좋음                                     |
| **토큰 사용량**         | meta.tokenUsage.totalTokens 합산    | 같은 품질이면 적을수록 좋음                       |
| **Bloom's 검증 통과율** | verifyResults에서 verdict=pass 비율 | 높을수록 난이도 정합성이 좋음                     |

**리포트 출력**: `output/question-bank/compare-report.md`에 마크다운 형태로 저장된다.

### 3단계: 수동 샘플링 평가

자동 비교로 확인하기 어려운 항목을 수동으로 평가한다.
각 approach에서 **난이도별 2개씩 총 6개**를 랜덤 추출하여 다음을 확인한다:

| 평가 항목       | 판단 기준                                            |
| --------------- | ---------------------------------------------------- |
| **면접 적합성** | 실제 CS 면접에서 물어볼 만한 질문인가? (1~5점)       |
| **난이도 체감** | Basic은 쉽고, Advanced는 어렵게 느껴지는가? (1~5점)  |
| **질문 명확성** | 질문 의도가 명확하고, 답변 범위가 적절한가? (1~5점)  |
| **의미적 중복** | 자동으로 잡지 못한 의미적 중복이 있는가? (있음/없음) |

### 비교 기준 요약

| 기준               | 설명                                                   | 측정 방법                                       |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| **다양성**         | 같은 도메인 내 질문들이 서로 다른 주제/관점을 다루는가 | 토픽 커버리지 수 (자동)                         |
| **난이도 구분**    | Basic/Intermediate/Advanced가 실제로 구분되는가        | Bloom's 검증 통과율 (자동) + 난이도 체감 (수동) |
| **질문 품질**      | 면접에서 실제로 물어볼 만한 질문인가                   | 면접 적합성 점수 (수동)                         |
| **중복률**         | 의미적으로 동일한 질문이 몇 개나 생성되었는가          | Jaccard 중복 쌍 (자동) + 의미적 중복 (수동)     |
| **Bloom's 정합성** | 질문의 인지 수준이 지정된 난이도와 일치하는가          | 검증 통과율 (자동)                              |
| **토큰 효율성**    | 같은 품질 대비 토큰 소비가 적은가                      | totalTokens (자동)                              |

### OS 토픽 기대 범위

생성된 질문이 아래 토픽들을 커버하는지 확인한다:

| 카테고리      | 주요 토픽                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| 프로세스 관리 | Process, Thread, Context Switch, Scheduling (FCFS, SJF, RR, Priority)       |
| 동기화        | Mutex, Semaphore, Deadlock, Race Condition, Monitor                         |
| 메모리 관리   | Paging, Segmentation, Virtual Memory, Page Replacement (LRU, FIFO, Optimal) |
| 파일 시스템   | File System, Directory, Inode, Disk Scheduling                              |
| I/O           | Interrupt, DMA, Buffering, Spooling                                         |

**커버리지 목표**: 최소 3개 카테고리 이상의 토픽이 포함되어야 함
