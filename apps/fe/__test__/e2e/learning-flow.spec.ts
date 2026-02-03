import { expect, test } from '@playwright/test';

const MOCK_SESSION_ID = 79;
const MOCK_ANSWER_ID = 100;

test.describe('4. 🤖 피드백 및 진행 흐름 (Feedback & Flow)', () => {
  test.beforeEach(async ({ page }) => {
    // 0. 가짜 오디오 스트림 주입 스크립트
    // MediaRecorder가 빈 스트림을 받으면 에러를 던지므로, 가짜 오디오 트랙을 직접 만들어 넣어줍니다.
    await page.addInitScript(() => {
      const createFakeStream = () => {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator(); // 가짜 소리 발생기
        osc.connect(dest);
        osc.start();
        return dest.stream;
      };

      // navigator.mediaDevices.getUserMedia를 가로채서 가짜 스트림 반환
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: async (constraints: MediaStreamConstraints) => {
          if (constraints.audio) {
            return createFakeStream();
          }
          return new MediaStream();
        },
        configurable: true,
      });
    });

    // 1. 공통 인증 및 유저 정보 Mocking
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { accessToken: 'fake_token' } }),
    );

    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        json: {
          profile: { nickname: '테스터' },
          progression: { level: 1, currentXp: 500, requiredXpForNextLevel: 1000 },
          studyStats: { streak: 1, solvedProblemCount: 5, totalStudyTime: 300 },
          remainingCredit: 20,
        },
      }),
    );

    // 2. 질문 데이터 주입을 위해 /learning 페이지를 거쳐 진입
    await page.route('**/api/learning/sessions', (route) =>
      route.fulfill({
        status: 200,
        json: {
          sessionId: MOCK_SESSION_ID,
          currentQuestionCount: 1,
          remainedCredit: 20,
          question: {
            questionId: 485,
            content: "'대기 상태' 프로세스의 주된 목적은 무엇인가요?",
            guide: '자원 해제 중심',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 180,
          },
        },
      }),
    );

    await page.goto('/learning');
    await page.getByText('운영체제').click();
    await page.getByText('초급', { exact: true }).click();
    await page.getByRole('button', { name: '학습 시작하기' }).click();
    await expect(page).toHaveURL(/\/learning\/question/);
  });

  /**
   * Flow-01: 실시간 평가 피드백 (SSE)
   */
  test('답변 제출 후 SSE 이벤트를 수신하며 상태 메시지가 변하고 최종 피드백이 노출되어야 한다', async ({
    page,
  }) => {
    // 1. 답변 준비 (STT Mock)
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '프로세스는 실행 중인 프로그램입니다.' } }),
    );

    // 마이크 버튼 조작 시뮬레이션
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click();
    await expect(micButton).toHaveAttribute('aria-label', '녹음 중지');

    await page.waitForTimeout(500);
    await micButton.click({ force: true });

    // 2. 평가 시작 API Mocking
    await page.route('**/api/learning/sessions/*/assess', (route) =>
      route.fulfill({
        status: 200,
        json: { jobId: 1, answerId: MOCK_ANSWER_ID, status: 'QUEUED' },
      }),
    );

    // 3. SSE 스트림 시뮬레이션
    await page.route(
      `**/learning/${MOCK_SESSION_ID}/answers/${MOCK_ANSWER_ID}/assess/stream`,
      async (route) => {
        // EVALUATING -> FEEDBACKING -> DONE 순서로 전송
        const sseContent =
          `data: ${JSON.stringify({ status: 'EVALUATING' })}\n\n` +
          `data: ${JSON.stringify({ status: 'FEEDBACKING' })}\n\n` +
          `data: ${JSON.stringify({ status: 'DONE' })}\n\n`;

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseContent,
        });
      },
    );

    // 4. 피드백 상세 데이터 Mocking
    await page.route('**/api/learning/answers/*/assess', (route) =>
      route.fulfill({
        status: 200,
        json: {
          answerId: MOCK_ANSWER_ID,
          overallScore: 85,
          strengths: ['핵심 개념을 잘 설명했습니다.'],
          weaknesses: ['예시 부족'],
          suggestions: ['팁'],
          xp: 100,
          remainingToken: 19,
        },
      }),
    );

    // 5. 제출 및 상태 변화 검증
    const submitButton = page.getByRole('button', { name: '답변 제출하기' });
    await submitButton.click();

    const aiFeedbackHeader = page.getByText('AI 피드백');
    await expect(aiFeedbackHeader).toBeVisible({ timeout: 10000 });

    // 데이터가 정상적으로 매핑되었는지 확인
    await expect(page.getByText('핵심 개념을 잘 설명했습니다.')).toBeVisible();
    await expect(page.getByText('예시 부족')).toBeVisible();
  });

  /**
   * Flow-02: 다음 질문 / 건너뛰기
   */
  test('답변 전 "건너뛰기"와 답변 후 "다음 질문"이 각각 올바르게 작동해야 한다', async ({
    page,
  }) => {
    // --- [단계 1: 답변 전 건너뛰기] ---
    // 1. 버튼 가시성 확인: 답변 전에는 '건너뛰기'가 보여야 함
    const skipButton = page.getByRole('button', { name: '다음 질문으로 건너뛰기' });
    await expect(skipButton).toBeVisible();

    // 2. API Mocking: 다음 질문 요청
    await page.route(`**/api/learning/sessions/${MOCK_SESSION_ID}/next-question`, (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentQuestionCount: 2,
          remainedCredit: 19,
          question: {
            questionId: 102,
            content: '두 번째 질문: 스레드란?',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 180,
          },
        },
      }),
    );

    await skipButton.click();

    // 3. UI 갱신 검증
    await expect(page.getByText('질문 2')).toBeVisible();
    await expect(page.getByText('두 번째 질문: 스레드란?')).toBeVisible();
    await expect(page.getByText('19')).toBeVisible(); // 크레딧 차감 확인

    // --- [단계 2: 답변 후 다음 질문] ---
    // 1. 답변 제출 및 피드백 완료 상태 만들기 (Mock)
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '답변' } }),
    );

    await page.route('**/api/learning/sessions/*/assess', (route) =>
      route.fulfill({
        status: 200,
        json: { jobId: 1, answerId: 500, status: 'QUEUED' },
      }),
    );

    await page.route(`**/learning/${MOCK_SESSION_ID}/answers/500/assess/stream`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ status: 'DONE' })}\n\n`,
      }),
    );

    await page.route('**/api/learning/answers/500/assess', (route) =>
      route.fulfill({
        status: 200,
        json: {
          overallScore: 80,
          strengths: ['굿'],
          weaknesses: [],
          suggestions: [],
          xp: 50,
          remainingToken: 18,
        },
      }),
    );

    // 마이크 조작 및 제출 (상태 전환 유도)
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click({ force: true });
    await page.waitForTimeout(500);
    await micButton.click({ force: true });

    await page.getByRole('button', { name: '답변 제출하기' }).click();

    // 2. 버튼 가시성 변화 확인: 피드백 완료 후에는 '다음 질문'으로 변경됨
    const nextButton = page.getByRole('button', { name: '다음 질문', exact: true });
    await expect(nextButton).toBeVisible();
    await expect(skipButton).not.toBeVisible();

    // 3. 클릭 시 새로운 질문(3번) 로드 확인
    await page.route(`**/api/learning/sessions/${MOCK_SESSION_ID}/next-question`, (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentQuestionCount: 3,
          remainedCredit: 18,
          question: {
            content: '세 번째 질문: 교착상태란?',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 180,
          },
        },
      }),
    );

    await nextButton.click();
    await expect(page.getByText('질문 3')).toBeVisible();
  });
  /**
   * Flow-03-A: 꼬리 질문 (비활성화)
   */
  test('답변 점수가 낮으면 딥다이브 버튼이 비활성화되어야 한다', async ({ page }) => {
    // 1. API Mocking (점수 0점)
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '부족한 답변' } }),
    );
    await page.route('**/api/learning/sessions/*/assess', (route) =>
      route.fulfill({ status: 200, json: { answerId: 505, status: 'QUEUED' } }),
    );
    await page.route(`**/learning/${MOCK_SESSION_ID}/answers/505/assess/stream`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ status: 'DONE' })}\n\n`,
      }),
    );
    await page.route('**/api/learning/answers/505/assess', (route) =>
      route.fulfill({
        status: 200,
        json: {
          answerId: 505,
          overallScore: 0,
          strengths: [],
          weaknesses: [],
          suggestions: [],
          remainingToken: 18,
        },
      }),
    );

    // 2. 답변 제출
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click({ force: true });
    await page.waitForTimeout(500);
    await micButton.click({ force: true });
    await page.getByRole('button', { name: '답변 제출하기' }).click();

    // 3. 검증
    const deepDiveButton = page.getByRole('button', { name: '딥다이브' });
    await expect(deepDiveButton).toBeVisible();
    await expect(deepDiveButton).toBeDisabled();
  });

  /**
   * Flow-03-B: 꼬리 질문 (활성화 및 동작)
   */
  test('답변 점수가 충분하면 딥다이브가 활성화되고, 클릭 시 꼬리 질문으로 전환된다', async ({
    page,
  }) => {
    await page.route(/\/api\/learning\/sessions\/.*\/record/, (route) =>
      route.fulfill({ status: 200, json: { sttText: '훌륭한 답변' } }),
    );

    await page.route(/\/api\/learning\/sessions\/.*\/assess/, (route) => {
      // assess 요청인지 stream 요청인지 구분
      if (route.request().url().includes('stream')) {
        return route.continue(); // stream은 아래 별도 핸들러에서 처리
      }
      return route.fulfill({ status: 200, json: { jobId: 1, answerId: 505, status: 'QUEUED' } });
    });

    // 스트림 요청도 정규식으로 안전하게 처리
    await page.route(/\/api\/learning\/.*\/assess\/stream/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ status: 'DONE' })}\n\n`,
      }),
    );

    // 피드백 데이터
    await page.route(/\/api\/learning\/answers\/.*\/assess/, (route) =>
      route.fulfill({
        status: 200,
        json: {
          answerId: 505,
          overallScore: 85,
          strengths: ['키워드 포함'],
          weaknesses: ['bad'],
          suggestions: ['추천'],
          remainingToken: 18,
        },
      }),
    );

    // 꼬리 질문 데이터
    await page.route(/\/api\/learning\/sessions\/.*\/deep-dive/, (route) =>
      route.fulfill({
        status: 200,
        json: {
          sessionId: MOCK_SESSION_ID,
          remainedCredit: 17,
          currentQuestionCount: 2,
          question: {
            extraQuestionId: 10,
            content: '컨텍스트 스위칭의 오버헤드에 대해 더 자세히 설명해주세요.',
            type: 'TAIL',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 120,
            guide: '',
          },
        },
      }),
    );

    // 답변 제출 흐름
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click({ force: true });
    await page.waitForTimeout(500);
    await micButton.click({ force: true });
    await page.getByRole('button', { name: '답변 제출하기' }).click();

    // 딥다이브 버튼 활성화 확인
    const deepDiveButton = page.getByRole('button', { name: '딥다이브' });
    await expect(deepDiveButton).toBeVisible({ timeout: 10000 });
    await expect(deepDiveButton).toBeEnabled();

    // 버튼을 누르면 -> API 요청이 가고 -> 응답이 와야 -> UI가 바뀝니다.
    const deepDivePromise = page.waitForResponse(
      (response) => response.url().includes('/deep-dive') && response.status() === 200,
    );

    await deepDiveButton.click();

    await deepDivePromise;

    // 4. 화면 전환 확인
    await expect(page.getByText(/컨텍스트 스위칭의 오버헤드/)).toBeVisible();

    // 피드백 섹션이 사라졌는지 확인 (화면 전환 검증)
    await expect(page.getByText('AI 피드백')).not.toBeVisible();
  });

  /**
   * Flow-04: 학습 종료 및 리워드 연출
   */
  test('답변이 포함된 세션 종료 시 레벨업 연출과 지식 서고 연출이 표시되어야 한다', async ({
    page,
  }) => {
    // 종료 API Mocking (레벨업 시나리오)
    await page.route('**/api/learning/sessions/*/finish', (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentXp: 100, // 레벨업 후 잔여 XP
          prevRequiredXpForNextLevel: 1000,
          requiredXpForNextLevel: 1200,
          level: 2,
          gainedXp: { baseXp: 500, difficultyBonus: 100, deepDiveBonus: 0 },
          category: 'OS',
          difficulty: 'EASY',
          questions: [{ content: '질문1', type: 'NORMAL', score: 90 }],
        },
      }),
    );

    // 학습 종료 버튼 클릭 (피드백 전/후 상태에 따라 동작)
    const endButton = page.getByRole('button', { name: '학습 종료' });
    await endButton.click();

    // 1. 리워드 모달(Radix UI Dialog) 확인
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('학습 성과 리포트')).toBeVisible();
    await expect(dialog.getByText('+600 XP')).toBeVisible();

    // 2. "결과 레벨"을 검증합니다.
    await expect(dialog.getByText(/Level.*2|Lv\.?.*2/i)).toBeVisible({ timeout: 15000 });

    // 3. 지식 서고(Knowledge Stack) 확인
    await expect(dialog.getByText(/오늘 답변한 질문들이/)).toBeVisible();
  });

  test('답변 없이 종료 시 리워드 미지급 메시지가 표시되어야 한다', async ({ page }) => {
    // 보상 없는 종료 Mocking
    await page.route('**/api/learning/sessions/*/finish', (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentXp: 500,
          level: 1,
          gainedXp: { baseXp: 0, difficultyBonus: 0, deepDiveBonus: 0 },
          questions: [],
        },
      }),
    );

    await page.getByRole('button', { name: '학습 종료' }).click();

    // 검증: 보상 없음 UI
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('학습 세션 종료')).toBeVisible();
    await expect(
      dialog.getByText('답변한 기록이 없어 이번 세션은 리워드가 지급되지 않습니다.'),
    ).toBeVisible();
    await expect(dialog.getByText('EMPTY STACK')).toBeVisible();
  });

  /**
   * Flow-05: 스트릭(Streak) 갱신
   */
  test('학습 완료 후 사이드바와 메인 페이지의 스트릭 숫자가 증가하고 활성화되어야 한다', async ({
    page,
  }) => {
    // 1. 학습 종료 API Mocking (레벨업, 정산)
    await page.route('**/api/learning/sessions/*/finish', (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentXp: 100,
          level: 2,
          gainedXp: { baseXp: 200, difficultyBonus: 0, deepDiveBonus: 0 },
          questions: [{ content: '질문', type: 'NORMAL', score: 100 }],
        },
      }),
    );

    // [핵심] 정산 후(메인으로 돌아갈 때) 호출되는 유저 정보 Mocking
    // streak 1 -> 2 로 증가 가정
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        json: {
          profile: { nickname: '테스터' },
          progression: { level: 2, currentXp: 100, requiredXpForNextLevel: 1200 },
          studyStats: { streak: 2, solvedProblemCount: 6, totalStudyTime: 700 }, // streak 2
          remainingCredit: 19,
        },
      }),
    );

    // 2. 학습 종료
    const endButton = page.getByRole('button', { name: '학습 종료' });
    await expect(endButton).toBeVisible();
    await endButton.click();

    // 3. 결과 모달에서 메인 이동
    const backButton = page.getByRole('button', { name: '메인으로 돌아가기' });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // 4. 메인 페이지 이동 및 스트릭 확인
    await expect(page).toHaveURL('/learning');
    await expect(page.getByText(/연속.*2일/)).toBeVisible();

    const streakIcon = page.locator('svg.lucide-flame');
    await expect(streakIcon).toBeVisible();
    await expect(streakIcon).toHaveClass(/text-orange|text-primary/);
  });
});
