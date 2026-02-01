# 💬 말하면서 배우는 CS 지식 AI 학습 서비스, Talk It

<div align="center">

[![Gemini-Generated-Image-1valf71valf71val.png](https://i.postimg.cc/DzF4VC00/Gemini-Generated-Image-1valf71valf71val.png)](https://postimg.cc/PC35YQmn)

<a href="https://www.notion.so/Web22-2c3d2bdba92980ac820aed84d0d4e12d?source=copy_link">팀 노션</a>
&nbsp;|&nbsp;
<a href="https://www.figma.com/board/CT49cFNdGPoucTTtq4UJ3u/%ED%95%B4%EB%82%BC-%ED%8C%80%EC%9D%98-%EC%8A%A4%ED%94%84%EB%A6%B0%ED%8A%B8?node-id=0-1&t=Wa9hhFvaDmqi3BrX-1">팀 스프린트 캔버스</a>
&nbsp;|&nbsp;
<a href="https://www.figma.com/design/pdCdKem74PweQIl0hVt049/%ED%95%B4%EB%82%BC-%ED%8C%80%EC%9D%98-%EC%84%9C%EB%B9%84%EC%8A%A4-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&t=ovdnjVtuWWmxYeGe-1">팀 피그마</a>

</div>

> **👉 Talk It 서비스 바로가기:** [https://talk-it-it.duckdns.org/](https://talk-it-it.duckdns.org/)
> <br>

## 🖼️ 프로젝트 소개

> **"CS 면접, 눈으로만 읽고 계신가요? 이제 말하면서 내 것으로 만드세요."**

**Talk It**은 사용자가 CS 개념을 직접 말로 설명하면, **AI가 이를 인식하여 평가하고 피드백을 제공하는 학습 플랫폼**입니다.
단순한 퀴즈 풀이가 아닌, **꼬리 질문(Deep Dive)** 을 통해 실제 면접처럼 깊이 있는 학습을 유도합니다.

**💡 기획 배경**

- 눈으로만 보는 공부는 휘발성이 강합니다.
- 실제 기술 면접에서는 '말로 설명하는 능력'이 가장 중요합니다.
- 혼자서는 내 답변이 논리적인지, 정확한지 파악하기 어렵습니다.

---

## 🎯 핵심 기능

### 1. 음성 답변 & AI 피드백

사용자가 마이크를 통해 답변하면, 답변 내용을 텍스트로 변환하고 AI가 **핵심 키워드 포함 여부**와 **논리적 정확성**을 분석해 점수를 매깁니다.

|                                      답변 녹음 화면                                      |                                       AI 분석 결과 화면                                        |
| :--------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------: |
| [![malhagi.gif](https://i.postimg.cc/MKQXL09t/malhagi.gif)](https://postimg.cc/F7h9dS5J) | [![pideubaeg2.gif](https://i.postimg.cc/sx06ZCFy/pideubaeg2.gif)](https://postimg.cc/vxfLpjHS) |
|                                 _"STT를 통한 음성 인식"_                                 |                                    _"AI 분석 피드백 제공"_                                     |

### 2. 학습을 확장하는 '꼬리 질문'

답변이 부족하거나 더 깊은 내용이 필요할 때, AI가 맥락에 맞는 **추가 질문(꼬리 질문)** 을 생성하여 심층 학습을 유도합니다.

| 꼬리 질문 생성 |
| :---:
| [![kkolijilmun.gif](https://i.postimg.cc/2SLJhy8d/kkolijilmun.gif)](https://postimg.cc/rDcQL84z) |

### 3. 지식이 쌓이는 시각적 경험 (Gamification)

학습을 완료할 때마다 경험치(XP)를 획득하고, **3D 애니메이션으로 구현된 책**이 내 서재에 쌓입니다.

| 3D 책 쌓기 애니메이션 |
| :---:
| [![chaegssahgi2.gif](https://i.postimg.cc/76ryf73w/chaegssahgi2.gif)](https://postimg.cc/JyxFFsY2) |

---

## 🔮 Future Roadmap

Talk It은 현재의 핵심 기능에 머무르지 않고, 지속적인 학습 동기 부여와 상호작용을 위해 다음과 같은 기능을 준비 중입니다.

- **📊 마이페이지 & 학습 분석**
  - 누적된 학습 데이터를 시각화하여 나의 성장 그래프를 제공합니다.
  - 과거 답변 다시 듣기 및 재도전 기능을 통해 메타인지 학습을 강화합니다.
- **⚔️ 1:1 실시간 CS 배틀**
  - Socket.io를 활용하여 다른 사용자와 실시간으로 매칭됩니다.
  - 동일한 주제에 대해 답변하고, AI가 판정한 점수로 승패를 겨루는 경쟁 모드입니다.
- **🏆 업적 & 뱃지 시스템**
  - 단순한 레벨업을 넘어, 특정 조건(예: '연속 3일 학습', '배틀 10승') 달성 시 고유 뱃지를 수여합니다.

<br>

## 🛠️ 기술 스택

| Category     | Tech Stack                                                                 | Badges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :----------- | :------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Common**   | pnpm, TurboRepo, Docker, Nginx, GitHub Actions                             | ![pnpm](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220) ![TurboRepo](https://img.shields.io/badge/TurboRepo-000000?style=for-the-badge&logo=turborepo&logoColor=white) ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) <br> ![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)                                                                                                                                                                                                                                                                                                                                                  |
| **Backend**  | NestJS, Prisma, Redis, Zod, Swagger                                        | ![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white) ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white) <br> ![Zod](https://img.shields.io/badge/zod-%233E67B1.svg?style=for-the-badge&logo=zod&logoColor=white) ![Swagger](https://img.shields.io/badge/-Swagger-%23C1E1C1?style=for-the-badge&logo=swagger&logoColor=black)                                                                                                                                                                                                                                                                                                                                                                                  |
| **Frontend** | React, Vite, Tailwind, Three.js, Radix UI, Zustand, TanStack Router, axios | ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Three.js](https://img.shields.io/badge/threejs-black?style=for-the-badge&logo=three.js&logoColor=white) <br> ![Radix UI](https://img.shields.io/badge/Radix%20UI-161618.svg?style=for-the-badge&logo=radix-ui&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-%23443E38.svg?style=for-the-badge&logo=react&logoColor=white) ![TanStack Router](https://img.shields.io/badge/TanStack%20Router-%23FF4154.svg?style=for-the-badge&logo=react&logoColor=white) ![axios](https://img.shields.io/badge/axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white) |
| **Database** | MySQL 8.4 (LTS), NCP Object Storage                                        | ![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white) ![NCP](https://img.shields.io/badge/NCP%20Object%20Storage-03C75A?style=for-the-badge&logo=naver&logoColor=white)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 👥 **팀원 소개**

### 🐋 Web22 해낼 팀

<div align="center">
<table>
  <tr align="center">
    <th>J052 김연신</th>
    <th>J174 윤혜정</th>
    <th>J180 이다은</th>
    <th>J202 이우현</th>
  </tr>
  <tr align="center">
    <td>
      <img src="http://github.com/YeonShin.png" width="130px"/>
      <br/>
      <a href="http://github.com/YeonShin" target="_blank">
       <b>YeonShin</b>
      </a>
      <br/>
      <sup>희망 직무: 프론트엔드</sup>
    </td>
    <td>
      <img src="http://github.com/hjyoon99.png" width="130px"/>
      <br/>
      <a href="http://github.com/hjyoon99" target="_blank">
       <b>hjyoon99</b>
      </a>
      <br/>
      <sup>희망 직무: 백엔드</sup>
    </td>
    <td>
      <img src="http://github.com/llddang.png" width="130px"/>
      <br/>
      <a href="http://github.com/llddang" target="_blank">
       <b>llddang</b>
      </a>
      <br/>
      <sup>희망 직무: 프론트엔드</sup>
    </td>
    <td>
      <img src="http://github.com/woohyun365.png" width="130px"/>
      <br/>
      <a href="http://github.com/woohyun365" target="_blank">
       <b>woohyun365</b>
      </a>
      <br/>
      <sup>희망 직무: 백엔드</sup>
    </td>
  </tr>
</table>
</div>
