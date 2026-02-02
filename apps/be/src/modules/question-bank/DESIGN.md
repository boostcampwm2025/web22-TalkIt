# Question Bank 모듈 설계 문서

## 개요

CS 면접 질문 은행 시스템. 4개 도메인(OS, NETWORK, DB, DATA_STRUCTURE)에 대해
커리큘럼 기반으로 질문을 생성하고, 중복 검사 후 DB에 저장하는 파이프라인.

---

## 아키텍처 흐름

```
[Step 1] 커리큘럼 정의 (정적 TS)
    ↓
[Step 2] 질문 생성 (Clova LLM)
    ↓  → draft JSON 저장
[Step 3] 중복 검사 (Clova LLM) + total_difficulty 계산
    ↓  → final JSON 저장
[Step 4] DB 저장 (별도 스크립트)
```

---

## 디렉토리 구조

```
apps/be/src/modules/question-bank/
├── data/
│   ├── curriculum.types.ts          # 커리큘럼 타입 정의
│   ├── curriculum-os.ts             # OS 커리큘럼
│   ├── curriculum-network.ts        # NETWORK 커리큘럼
│   ├── curriculum-db.ts             # DB 커리큘럼
│   ├── curriculum-data-structure.ts # DATA_STRUCTURE 커리큘럼
│   └── depth-criteria.ts           # 질문 깊이 기준
├── generator/
│   ├── question-generator.service.ts   # 질문 생성 서비스 (Step 2)
│   └── question-generator.prompt.ts    # Clova 프롬프트 템플릿
├── validator/
│   ├── dedup-validator.service.ts      # 중복 검사 서비스 (Step 3)
│   └── dedup-validator.prompt.ts       # 중복 검사 프롬프트
├── common/
│   ├── question-bank.types.ts          # 공통 타입 (DraftQuestion, FinalQuestion 등)
│   ├── difficulty-calculator.ts        # total_difficulty 계산 로직
│   └── file-manager.ts                # JSON 파일 저장/로드 유틸
├── question-bank.module.ts
└── question-bank.service.ts            # 전체 파이프라인 오케스트레이션
```

출력 파일 경로:

```
apps/be/resource/question-bank/
├── draft/    # {category}-{chapter}-{term}-{date}-{HHmmss}-draft.json
└── final/    # {category}-{chapter}-{date}-{HHmmss}-final.json
```

---

## Step 1: 커리큘럼 정의

### 타입 정의 (`curriculum.types.ts`)

```typescript
export type Domain = 'OS' | 'NETWORK' | 'DB' | 'DATA_STRUCTURE';

export type ConceptLevel = 'Basic' | 'Intermediate' | 'Advanced';

export interface KeyConcept {
  term: string; // 예: 'Process', 'Thread'
  conceptLevel: ConceptLevel;
}

export interface Chapter {
  chapter: number; // 1, 2, 3...
  title: string; // '운영체제 개요 및 구조'
  keyConcepts: KeyConcept[];
}

export interface Curriculum {
  domain: Domain;
  chapters: Chapter[];
}

export type CurriculumMap = Record<Domain, Curriculum>;
```

### ConceptLevel → 숫자 매핑

| ConceptLevel | 숫자 | 설명                    |
| ------------ | ---- | ----------------------- |
| Basic        | 1    | 정의, 기본 개념         |
| Intermediate | 2    | 동작 원리, 비교         |
| Advanced     | 3    | 설계 판단, 트레이드오프 |

### 커리큘럼 예시 (`curriculum-os.ts`)

```typescript
export const OS_CURRICULUM: Curriculum = {
  domain: 'OS',
  chapters: [
    {
      chapter: 1,
      title: '운영체제 개요 및 구조',
      keyConcepts: [
        { term: '운영체제 정의와 역할', conceptLevel: 'Basic' },
        { term: 'Kernel', conceptLevel: 'Basic' },
        { term: 'System Call', conceptLevel: 'Intermediate' },
        { term: 'Interrupt', conceptLevel: 'Intermediate' },
        { term: 'Dual Mode', conceptLevel: 'Intermediate' },
        { term: '운영체제 구조(모놀리식, 마이크로커널)', conceptLevel: 'Advanced' },
      ],
    },
    // ... chapter 2~N
  ],
};
```

### 커리큘럼 도메인별 목차 (최종 확정은 구현 시)

| 도메인         | 예상 챕터 수 | 주요 주제                                         |
| -------------- | ------------ | ------------------------------------------------- |
| OS             | 8~10         | 프로세스, 스레드, 스케줄링, 메모리, 파일시스템 등 |
| NETWORK        | 8~10         | OSI/TCP-IP, HTTP, DNS, 소켓, 보안 등              |
| DB             | 8~10         | RDBMS, SQL, 인덱스, 트랜잭션, 정규화 등           |
| DATA_STRUCTURE | 8~10         | 배열, 링크드리스트, 트리, 그래프, 해시, 정렬 등   |

---

## Step 2: 질문 생성

### Input

```typescript
interface GenerateInput {
  category: Domain; // 'OS'
  chapter: number; // 1
  count?: number; // default: 10
}
```

### 내부 동작

1. `category`와 `chapter`로 커리큘럼에서 해당 챕터의 `keyConcepts` 조회
2. 각 `keyConcept`마다 **1회 LLM 호출** → depth 1/2/3이 골고루 섞인 질문 `count`개 생성
3. 결과를 **concept당 하나의 draft 파일**로 저장 (depth가 혼합된 상태)

> **호출 단위**: concept 1개 = LLM 1회 호출. 챕터에 concept이 6개면 6회 호출.

### Clova 프롬프트 설계

```
[시스템]
당신은 CS 면접 질문을 생성하는 전문가입니다.

[지시]
다음 개념에 대해 3가지 깊이 수준의 면접 질문을 총 {count}개 생성하세요.

- 도메인: {domain}
- 챕터: {chapter} - {chapterTitle}
- 개념: {term} (개념 난이도: {conceptLevel})

[질문 깊이 기준]
- depth 1 (Low): 정의·목적·기본 특성을 묻는다. 패턴: "~란?", "~의 목적은?", "~의 기본 특성은?"
- depth 2 (Mid): 동작 원리·비교·내부 구조를 묻는다. 패턴: "~의 동작 과정을 설명하세요.", "~와 ~를 비교하세요."
- depth 3 (High): 설계 판단·트레이드오프·실무 시나리오를 묻는다. 패턴: "~상황에서 어떤 전략을 선택하겠나요?", "~의 한계와 대안을 논하세요."

각 depth가 골고루 포함되도록 생성하세요.

[출력 형식]
JSON 배열로 반환하세요:
[
  {
    "term": "{term}",
    "depth": 1 | 2 | 3,
    "keywords": ["키워드1", "키워드2", ...],
    "content": "질문 내용"
  }
]

[제약]
- 질문은 한국어로 작성
- keywords는 답변에 반드시 포함되어야 할 핵심 용어 2~5개
- 질문은 면접관이 묻는 말투로 작성
- 각 질문은 서로 다른 관점에서 출제
- depth 1, 2, 3이 골고루 분배되도록 (예: 10개면 3/3/4 또는 4/3/3)
```

### Clova 호출 파라미터

| 파라미터            | 값      | 설명                                |
| ------------------- | ------- | ----------------------------------- |
| model               | HCX-003 | 또는 HCX-007 (환경변수로 제어)      |
| temperature         | 0.7     | 다양성 확보. 0.5~0.9 사이 조절 가능 |
| maxCompletionTokens | 2048    | 질문 10개 기준 충분한 토큰          |
| topP                | 0.8     | 상위 확률 80% 토큰만 샘플링         |

> **제어 가능 속성**: `temperature`(창의성), `maxCompletionTokens`(응답 길이), `topP`(다양성), `count`(질문 수)

### Output (DraftQuestion)

```typescript
interface DraftQuestion {
  category: Domain;
  chapter: number;
  term: string;
  difficulty: 1 | 2 | 3; // conceptLevel 숫자 매핑
  depth: 1 | 2 | 3; // Low=1, Mid=2, High=3
  keywords: string[];
  content: string;
}
```

### 파일 저장

- 경로: `resource/question-bank/draft/`
- 파일명: `{category}-{chapter}-{term}-{YYYYMMDD}-{HHmmss}-draft.json`
- 예시: `OS-1-Kernel-20260203-143022-draft.json`

---

## Step 3: 중복 검사 + 난이도 계산 + Final 저장

### 3-1. 중복 검사 (LLM 의미 유사도)

같은 `category` + `chapter` 내의 모든 draft 질문을 모아서 Clova에 유사도 판단 요청.

**프롬프트 설계:**

```
[시스템]
당신은 CS 면접 질문의 중복 여부를 판단하는 전문가입니다.

[지시]
아래 질문 목록에서 의미적으로 중복되는 질문 쌍을 찾으세요.
두 질문이 같은 내용을 다른 표현으로 묻고 있다면 중복입니다.
단, 같은 개념이라도 질문 깊이(depth)가 다르면 중복이 아닙니다.

[질문 목록]
{numberedQuestionList}

[출력 형식]
JSON 배열로 반환:
{
  "duplicates": [
    { "keep": 1, "remove": 3, "reason": "동일한 프로세스 정의를 묻는 질문" }
  ]
}
중복이 없으면 { "duplicates": [] }
```

**Clova 호출 파라미터:**

| 파라미터            | 값   | 설명             |
| ------------------- | ---- | ---------------- |
| temperature         | 0.0  | 결정적 판단 필요 |
| maxCompletionTokens | 1024 | 중복 목록은 짧음 |

### 3-2. total_difficulty 계산

```typescript
function calculateTotalDifficulty(
  conceptLevel: 1 | 2 | 3,
  depth: 1 | 2 | 3,
): 'EASY' | 'MEDIUM' | 'HARD' {
  const sum = conceptLevel + depth;

  // EASY:  (1,1) (2,1) (1,2)  → sum ≤ 3
  // MEDIUM: (3,1) (2,2) (1,3) → sum = 4
  // HARD:  (3,2) (2,3) (3,3)  → sum ≥ 5

  if (sum <= 3) return 'EASY';
  if (sum === 4) return 'MEDIUM';
  return 'HARD';
}
```

검증:
| conceptLevel | depth | sum | total_difficulty |
|-------------|-------|-----|-----------------|
| 1 | 1 | 2 | EASY |
| 2 | 1 | 3 | EASY |
| 1 | 2 | 3 | EASY |
| 3 | 1 | 4 | MEDIUM |
| 2 | 2 | 4 | MEDIUM |
| 1 | 3 | 4 | MEDIUM |
| 3 | 2 | 5 | HARD |
| 2 | 3 | 5 | HARD |
| 3 | 3 | 6 | HARD |

### 3-3. FinalQuestion 타입

```typescript
interface FinalQuestion {
  category: Domain;
  chapter: number;
  term: string;
  difficulty: 1 | 2 | 3; // conceptLevel
  depth: 1 | 2 | 3;
  totalDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  keywords: string[];
  content: string;
  contentHash: string; // SHA256(content)
}
```

### 파일 저장

- 경로: `resource/question-bank/final/`
- 파일명: `{category}-{chapter}-{YYYYMMDD}-{HHmmss}-final.json`
- 예시: `OS-1-20260203-143522-final.json`

---

## DB 스키마 변경 (기존 Question 테이블 확장)

### 추가 컬럼

```prisma
model Question {
  // 기존 컬럼
  id           Int        @id @default(autoincrement())
  category     Category
  difficulty   Difficulty                              // → totalDifficulty 매핑
  topicId      String                                  // → "{category}-{chapter}-{term}" 형식 유지
  content      String     @db.Text
  contentHash  String     @db.Char(64)
  mustInclude  Json                                    // → keywords 배열 저장
  timeLimitSec Int        @default(180)
  createdAt    DateTime   @default(now())

  // 추가 컬럼
  chapter      Int                                     // 챕터 번호
  term         String     @db.VarChar(100)              // 개념 용어
  conceptLevel Int        @map("concept_level")         // 1, 2, 3
  depth        Int                                     // 1, 2, 3

  // 기존 관계
  rubricItems  QuestionRubricItem[]
  answers      UserAnswer[]

  @@index([category, difficulty])
  @@index([category, difficulty, topicId])
  @@unique([category, difficulty, topicId, contentHash], name: "category_difficulty_topicId_contentHash")
}
```

### 필드 매핑 관계

| question-bank 출력 | DB Question 컬럼   | 비고                               |
| ------------------ | ------------------ | ---------------------------------- |
| category           | category           | enum Category 그대로               |
| chapter            | chapter (신규)     | nullable, 기존 데이터 영향 없음    |
| term               | term (신규)        | nullable                           |
| difficulty (1,2,3) | conceptLevel(신규) | 개념 난이도 숫자                   |
| depth (1,2,3)      | depth (신규)       | 질문 깊이 숫자                     |
| totalDifficulty    | difficulty         | 기존 Difficulty enum 재활용        |
| keywords           | mustInclude        | 기존 Json 필드 재활용              |
| content            | content            | 그대로                             |
| contentHash        | contentHash        | SHA256(content)                    |
| topicId            | topicId            | `{category}-{chapter}-{term}` 생성 |

---

## 구현 스텝 및 커밋 계획

### Step 1: 커리큘럼 데이터 정의

> 커밋: `feat: question-bank 커리큘럼 타입 및 4개 도메인 데이터 정의 #167`

작업 내용:

1. `question-bank/data/curriculum.types.ts` - 타입 정의
2. `question-bank/data/depth-criteria.ts` - 질문 깊이 기준
3. `question-bank/data/curriculum-os.ts` - OS 커리큘럼 (8~10 챕터)
4. `question-bank/data/curriculum-network.ts` - NETWORK 커리큘럼
5. `question-bank/data/curriculum-db.ts` - DB 커리큘럼
6. `question-bank/data/curriculum-data-structure.ts` - DATA_STRUCTURE 커리큘럼
7. `question-bank/common/question-bank.types.ts` - DraftQuestion, FinalQuestion 타입
8. `question-bank/common/difficulty-calculator.ts` - totalDifficulty 계산 함수

---

### Step 2: 질문 생성 서비스 구현

> 커밋: `feat: Clova LLM 기반 질문 생성 서비스 구현 #167`

작업 내용:

1. `question-bank/common/file-manager.ts` - JSON 파일 저장/로드 유틸
2. `question-bank/generator/question-generator.prompt.ts` - 프롬프트 템플릿
3. `question-bank/generator/question-generator.service.ts` - 질문 생성 로직
   - 커리큘럼 조회
   - concept별 depth 배분
   - Clova 호출 및 응답 파싱
   - draft JSON 저장
4. `question-bank/question-bank.module.ts` - NestJS 모듈 등록
5. `question-bank/question-bank.service.ts` - 파이프라인 오케스트레이션

---

### Step 3: 중복 검사 및 Final 생성

> 커밋: `feat: LLM 의미 유사도 중복 검사 및 final 질문 생성 #167`

작업 내용:

1. `question-bank/validator/dedup-validator.prompt.ts` - 중복 검사 프롬프트
2. `question-bank/validator/dedup-validator.service.ts` - 중복 검사 로직
   - 같은 chapter 내 draft 질문 수집
   - Clova로 유사도 판단
   - 중복 제거
   - totalDifficulty 계산
   - contentHash 생성
   - final JSON 저장

---

### Step 4: DB 스키마 마이그레이션 + import 스크립트

> 커밋: `feat: Question 테이블 확장 및 question-bank import 스크립트 #167`

작업 내용:

1. `prisma/schema.prisma` - Question 모델에 chapter, term, conceptLevel, depth 추가
2. Prisma migration 실행
3. `scripts/import-question-bank.ts` - final JSON → DB import 스크립트
   - final JSON 파일 읽기
   - FinalQuestion → Question 모델 매핑
   - topicId 생성 (`{category}-{chapter}-{term}`)
   - upsert (contentHash 기준 중복 방지)

---

## LLM 제어 가능 속성 정리

### 질문 생성 (Step 2)

| 속성                | 기본값 | 범위     | 영향                                  |
| ------------------- | ------ | -------- | ------------------------------------- |
| temperature         | 0.7    | 0.0~1.0  | 높을수록 다양한 질문, 낮을수록 정형적 |
| maxCompletionTokens | 2048   | 256~4096 | 응답 길이 제한                        |
| topP                | 0.8    | 0.0~1.0  | 샘플링 다양성                         |
| count               | 10     | 1~50     | 챕터당 생성할 질문 수                 |

### 중복 검사 (Step 3)

| 속성                | 기본값 | 범위     | 영향             |
| ------------------- | ------ | -------- | ---------------- |
| temperature         | 0.0    | 고정     | 결정적 판단 필요 |
| maxCompletionTokens | 1024   | 512~2048 | 중복 목록 길이   |

### 환경변수로 제어

```env
# question-bank 전용
QB_LLM_TEMPERATURE=0.7
QB_LLM_MAX_TOKENS=2048
QB_LLM_TOP_P=0.8
QB_DEFAULT_COUNT=10
QB_DEDUP_TEMPERATURE=0.0
QB_DEDUP_MAX_TOKENS=1024
```

---

## 실행 방법 (예상)

```bash
# Step 2: 질문 생성
npx ts-node scripts/generate-questions.ts --category OS --chapter 1 --count 10

# Step 3: 중복 검사 + final 생성
npx ts-node scripts/validate-questions.ts --category OS --chapter 1

# Step 4: DB import
npx ts-node scripts/import-question-bank.ts --file resource/question-bank/final/OS-1-*.json
```

---

## 주의사항

1. **기존 데이터 호환**: 추가 컬럼은 모두 nullable → 기존 Question 데이터에 영향 없음
2. **Clova API 비용**: 질문 생성 시 concept × depth 조합만큼 호출 발생. count로 제어
3. **파일 우선**: DB 저장 전 반드시 final JSON 검수 가능하도록 파일로 먼저 출력
4. **topicId 형식**: 기존 `os-process-thread` 패턴 유지. `{category}-{chapter}-{term}` 소문자 변환
