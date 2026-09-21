# 💬 Talk It - 말하면서 배우는 CS 지식 AI 학습 서비스

<div align="center">

[![Talk It 대표 이미지](https://i.postimg.cc/DzF4VC00/Gemini-Generated-Image-1valf71valf71val.png)](https://postimg.cc/PC35YQmn)

<a href="https://www.notion.so/Web22-2c3d2bdba92980ac820aed84d0d4e12d?source=copy_link">팀 노션</a>
&nbsp;|&nbsp;
<a href="https://www.figma.com/board/CT49cFNdGPoucTTtq4UJ3u/%ED%95%B4%EB%82%BC-%ED%8C%80%EC%9D%98-%EC%8A%A4%ED%94%84%EB%A6%B0%ED%8A%B8?node-id=0-1&t=Wa9hhFvaDmqi3BrX-1">팀 스프린트 캔버스</a>
&nbsp;|&nbsp;
<a href="https://www.figma.com/design/pdCdKem74PweQIl0hVt049/%ED%95%B4%EB%82%BC-%ED%8C%80%EC%9D%98-%EC%84%9C%EB%B9%84%EC%8A%A4-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&t=ovdnjVtuWWmxYeGe-1">팀 피그마</a>

</div>

<br/>

## 🛎️ 서비스 소개

> 서비스 URL: [https://www.talkit.bond](https://www.talkit.bond)

**"CS 면접, 눈으로만 읽고 계신가요? 이제 말하면서 내 것으로 만드세요."**

- Talk It은 사용자가 CS 개념을 직접 말로 설명하면, AI가 이를 인식해 개념의 정확도를 평가하고 부족한 부분을 보완해 주는 학습 플랫폼입니다.
- 단순한 퀴즈 풀이가 아니라 꼬리 질문(Deep Dive)으로 실제 면접처럼 깊이 있는 학습을 유도합니다.
- 대상 사용자: CS 기초를 말하면서 정리하려는 전공 학생, CS 기술면접을 준비하는 신입 개발자, 내가 제대로 이해했는지 확인하고 싶은 독학 개발자

<br/>

## ❓ 배경 및 해결 목표

- 문제: "눈으로는 이해했는데 막상 말로 설명하려니 막힌다"는 경험처럼, 읽고 보는 학습은 휘발성이 강합니다. 실제 기술 면접에서는 말로 설명하는 능력이 중요하지만, 혼자서는 내 답변이 논리적이고 정확한지 파악하기 어렵습니다.
- 목표: "능동적 설명 → 즉각적 피드백 → 반복 학습"의 선순환으로, 혼자 공부할 때도 옆에서 봐주는 선생님이 있는 것 같은 학습 경험을 제공합니다.

<br/>

## ⭐ 주요 기능

### 1️⃣ 음성 답변 & AI 피드백

- 마이크로 답변하면 텍스트로 변환(Clova STT)하고, AI가 핵심 키워드 포함 여부와 논리적 정확성을 분석해 피드백을 줍니다.
- 평가는 비동기로 처리되어(BullMQ Worker) 결과가 준비되는 대로 실시간(SSE)으로 전달됩니다.

|               답변 녹음 화면                |               AI 분석 결과 화면                |
| :-----------------------------------------: | :--------------------------------------------: |
| ![답변 녹음 화면](assets/readme/말하기.gif) | ![AI 분석 결과 화면](assets/readme/피드백.gif) |

### 2️⃣ 학습을 확장하는 꼬리 질문

- 답변이 부족하거나 더 깊은 내용이 필요하면, AI가 맥락에 맞는 추가 질문을 생성해 심층 학습을 이어 갑니다.

![꼬리 질문 생성 화면](assets/readme/꼬리질문.gif)

### 3️⃣ 지식이 쌓이는 시각적 경험

- 학습을 완료할 때마다 경험치(XP)를 얻고, 3D 애니메이션으로 구현된 책이 내 서재에 쌓입니다. (Three.js)

![3D 책 쌓기 애니메이션](assets/readme/책쌓기.gif)

<br/>

## 🔧 기술 스택

> **Frontend**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Three.js](https://img.shields.io/badge/threejs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix%20UI-161618.svg?style=for-the-badge&logo=radix-ui&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-%23443E38.svg?style=for-the-badge&logo=react&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack%20Router-%23FF4154.svg?style=for-the-badge&logo=react&logoColor=white)

> **Backend**

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233E67B1.svg?style=for-the-badge&logo=zod&logoColor=white)
![Swagger](https://img.shields.io/badge/-Swagger-%23C1E1C1?style=for-the-badge&logo=swagger&logoColor=black)

> **Test / Tools**

![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)
![Playwright](https://img.shields.io/badge/-playwright-%232EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)
![TurboRepo](https://img.shields.io/badge/TurboRepo-000000?style=for-the-badge&logo=turborepo&logoColor=white)

> **Infra**

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white)
![Oracle Cloud](https://img.shields.io/badge/Oracle%20Cloud-F80000?style=for-the-badge&logo=oracle&logoColor=white)
![NCP](https://img.shields.io/badge/NCP-03C75A?style=for-the-badge&logo=naver&logoColor=white)

> 기술 선정 이유: [위키 - 기술 스택](https://github.com/boostcampwm2025/web22-TalkIt/wiki/기술-스택)

<br/>

## 🏗️ 시스템 아키텍처

<img width="1000" alt="시스템 아키텍처 다이어그램" src="assets/readme/시스템%20개요%28배포%20구조%29.png" />

- Oracle Cloud 앱 서버 1대에서 호스트 Nginx(HTTPS)가 요청을 받아 docker-compose 컨테이너 4개(Nginx, API, Redis, AI Worker)로 전달합니다.
- 컨테이너 Nginx가 정적 파일(React 빌드)을 서빙하고 `/api` 요청을 API 서버로 프록시합니다(SSE 지원).
- 음성 답변 평가(STT, LLM)는 Redis 큐(BullMQ)를 거쳐 Worker가 비동기로 처리하고, 진행 상태는 SSE로 전달합니다.
- 영속 데이터는 별도 MySQL 서버에, 녹음 오디오는 NCP Object Storage에 저장하며, STT·LLM은 Naver Clova를 사용합니다.

<br/>

## 📁 프로젝트 구조

```
web22-TalkIt
├── apps
│   ├── be                # NestJS API + BullMQ Worker
│   │   ├── docker        # 로컬 개발용 MySQL, Redis compose
│   │   ├── prisma        # 스키마
│   │   ├── scripts       # 문제은행 업로드/적재/워밍업 스크립트
│   │   └── src           # auth, learning, modules, stt, speech, worker ...
│   └── fe                # React + Vite (TanStack Router)
│       └── src           # routes, features, components, apis ...
└── packages
    ├── shared            # FE/BE 공용 Zod 스키마, 상수, 타입
    ├── eslint-config
    └── typescript-config
```

<br/>

## 🚀 설치 및 실행

### 사전 요구사항

| 도구    | 버전                    |
| ------- | ----------------------- |
| Node.js | 18 이상                 |
| pnpm    | 9.0.0                   |
| Docker  | 로컬 MySQL·Redis 실행용 |

### 1. 저장소 clone

```bash
git clone https://github.com/boostcampwm2025/web22-TalkIt.git
cd web22-TalkIt
```

### 2. 환경변수 설정

`apps/be/.env.example`을 복사해 `apps/be/.env`를 만들고 값을 채웁니다.

```bash
cp apps/be/.env.example apps/be/.env
```

<details>
  <summary><b>[apps/be/.env.example]</b></summary>

| 변수                                                        | 필수 | 설명                                    | 위치                                                       |
| ----------------------------------------------------------- | :--: | --------------------------------------- | ---------------------------------------------------------- |
| `PORT`                                                      | 선택 | API 포트 (기본 3000)                    | -                                                          |
| `DATABASE_URL`                                              |  ✅  | MySQL 연결 문자열                       | 로컬 Docker: `mysql://root:rootpass@127.0.0.1:3307/talkit` |
| `REDIS_HOST`, `REDIS_PORT`                                  |  ✅  | BullMQ 큐, 캐시                         | 로컬 Redis (`127.0.0.1:6379`)                              |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                   |  ✅  | 토큰 서명 키. **서버 전용, 노출 금지**  | 임의의 강력한 문자열                                       |
| `JWT_ACCESS_EXPIRATION_TIME`, `JWT_REFRESH_EXPIRATION_TIME` |  ✅  | 토큰 만료 시간 (예: `1h`, `14d`)        | -                                                          |
| `OBJECT_STORAGE_BUCKET_NAME`, `NCLOUD_OBJECT_ENDPOINT`      |  ✅  | 오디오 저장 버킷, 엔드포인트            | NCP 콘솔 > Object Storage                                  |
| `NCP_ACCESS_KEY_ID`, `NCP_SECRET_ACCESS_KEY`                |  ✅  | Object Storage 접근 키                  | NCP 콘솔 > 인증키 관리                                     |
| `CLOVA_SPEECH_INVOKE_URL`, `CLOVA_SPEECH_SECRET_KEY`        |  ✅  | Clova Speech(STT)                       | Clova Speech 콘솔 "설정 > 연동 정보"                       |
| `CLOVA_API_KEY`, `CLOVA_BASE_URL`                           |  ✅  | CLOVA Studio(LLM 평가)                  | CLOVA Studio                                               |
| `CLOVA_MODEL`, `CLOVA_NORMAL_MODEL`                         |  ✅  | 평가·일반 모델명 (예: HCX-007, HCX-003) | -                                                          |

- 음성 인식(STT), LLM 평가, 오디오 저장은 외부 서비스 키가 필요합니다.
- 프론트엔드는 `VITE_API_URL`을 설정하지 않으면 `http://localhost:3000/api`를 사용하므로 로컬 실행 시 별도 `.env`가 필요 없습니다.

</details>

### 3. 의존성 설치

```bash
pnpm install
```

### 4. DB·Redis 실행 및 Prisma 준비

```bash
pnpm --filter be db:up       # MySQL (호스트 3307)
pnpm --filter be cache:up    # Redis (호스트 6379)

cd apps/be
pnpm prisma generate
pnpm prisma migrate dev -n init
pnpm exec ts-node prisma/seed.ts   # 레벨별 필요 XP 시드

# 로컬 개발용 샘플 문제(4개 분야 × 3개 난이도) 적재 후 Redis 질문 풀 워밍업
pnpm run script:import -- -source local -path ./prisma/sample-questions.json
pnpm run script:warmup
cd ../..
```

- 학습 세션은 Redis 질문 풀에서 문제를 뽑기 때문에, import와 warmup을 하지 않으면 세션 생성 시 `Question pool not warmed` 에러가 납니다.
- 샘플 문제는 로컬 개발용입니다. 운영 문제은행은 Object Storage에서 읽으며(`pnpm run script:import`, NCP 키 필요), 자세한 내용은 [apps/be/RUN.md](apps/be/RUN.md)를 참고하세요.

### 5. 실행

```bash
pnpm dev                       # FE + API (turbo)
pnpm --filter be dev:worker    # 평가 Worker (별도 터미널)
```

### 6. 접속

👉 프론트엔드: http://localhost:5173
👉 API 문서(Swagger): http://localhost:3000/api

<br/>

## 📖 사용법

1. 이메일/비밀번호로 로그인합니다.
2. 학습 분야(OS, 네트워크, 자료구조, DB 등)와 난이도(초급/중급/고급)를 선택해 학습 세션을 만듭니다.
3. 질문이 나오면 말하기 버튼을 눌러 음성으로 답변합니다. 답변은 텍스트(STT)로 변환됩니다.
4. AI가 정확한 부분, 보완하면 좋을 점, 도움이 될 팁을 피드백합니다.
5. 다시 답변하기, 다음 질문, 꼬리 질문(Deep Dive), 학습 종료 중 다음 행동을 선택합니다.
6. 학습을 종료하면 XP를 얻고, 책 쌓기 애니메이션과 세션 결과 요약을 확인합니다.

<img width="800" alt="서비스 사용자 흐름도" src="assets/readme/서비스%20사용자%20흐름.png" />

<br/>

## ✅ 테스트

```bash
pnpm --filter be test         # BE 단위 테스트
pnpm --filter be test:e2e     # BE e2e
```

FE e2e(Playwright)는 최초 1회 브라우저 설치가 필요합니다. API 응답을 모킹하므로 백엔드는 실행하지 않아도 되고, 테스트 시작 시 FE dev 서버(`localhost:5173`)가 자동으로 실행됩니다.

```bash
pnpm --filter fe exec playwright install chromium           # 최초 1회: 브라우저 설치
pnpm --filter fe test:e2e --project=chromium                # chromium으로 실행
```

> e2e는 chromium 기준으로 작성되어 있습니다. 마이크 권한 설정(`permissions: ['microphone']`)이 Firefox에서 지원되지 않아 `--project=firefox`는 실행되지 않고, WebKit은 추가 시스템 라이브러리가 필요합니다.
> Linux/WSL에서는 chromium 실행에도 시스템 라이브러리가 필요할 수 있습니다: `sudo pnpm --filter fe exec playwright install-deps chromium`

<br/>

## ⛏️ 기술 경험 및 트러블슈팅

각자의 기여와 기술 경험은 위키에서 확인할 수 있습니다. → [Talk It 위키](https://github.com/boostcampwm2025/web22-TalkIt/wiki)

### [BE] 평가·피드백 LLM 최적화 및 큐 성능 개선 실험

- 작성자: J174 윤혜정
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/평가-및-피드백-LLM-최적화-및-큐-성능-개선-실험)

### [BE] STT 정규화 처리 방식 최종 결정

- 작성자: J174 윤혜정
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/STT-정규화-처리-방식-최종-결정)

### [BE] 사용자 인증 구현 상세 및 트레이드오프

- 작성자: J052 김연신
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/사용자-인증-구현-상세-및-트레이드오프)

### [Infra] 배포 구조 설계

- 작성자: J202 이우현
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/배포-구조-설계)

### [FE] 클라이언트 녹음 전송 및 오디오 포맷 전략

- 작성자: J052 김연신, J174 윤혜정
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/클라이언트-녹음-전송-및-오디오-포맷-전략)

### [FE] 상태 초기화 미동작 이슈 해결

- 작성자: J180 이다은
- [🔗 링크](https://github.com/boostcampwm2025/web22-TalkIt/wiki/상태-초기화-미동작-이슈-해결)

<br/>

## 👥 팀원 소개

| <a href="https://github.com/YeonShin"><img src="https://github.com/YeonShin.png" width="100" alt="김연신 GitHub 프로필 사진" /></a> | <a href="https://github.com/hjyoon99"><img src="https://github.com/hjyoon99.png" width="100" alt="윤혜정 GitHub 프로필 사진" /></a> | <a href="https://github.com/llddang"><img src="https://github.com/llddang.png" width="100" alt="이다은 GitHub 프로필 사진" /></a> | <a href="https://github.com/woohyun365"><img src="https://github.com/woohyun365.png" width="100" alt="이우현 GitHub 프로필 사진" /></a> |
| :---------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------: |
|                                **김연신**<br/>Frontend<br/>[@YeonShin](https://github.com/YeonShin)                                 |                                 **윤혜정**<br/>Backend<br/>[@hjyoon99](https://github.com/hjyoon99)                                 |                                **이다은**<br/>Frontend<br/>[@llddang](https://github.com/llddang)                                 |                                 **이우현**<br/>Backend<br/>[@woohyun365](https://github.com/woohyun365)                                 |
