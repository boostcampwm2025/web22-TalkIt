import { expect, test } from '@playwright/test';

test.describe('6. 🛠️ 기술적 예외 및 안정성 (Technical Edge Cases)', () => {
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

    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { accessToken: 'fake_token' } }),
    );

    // 기본 유저 정보 (Tech-04 등에서 덮어쓰기 전까지 기본값)
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        json: {
          profile: { nickname: '테스터' },
          progression: { level: 1, currentXp: 900, requiredXpForNextLevel: 1000 },
          studyStats: { streak: 7, solvedProblemCount: 10, totalStudyTime: 600 },
          remainingCredit: 20,
        },
      }),
    );
  });

  /**
   * Tech-01: 마이크 권한 거부 상태
   */
  test('마이크 권한이 거부된 상태에서 녹음 시도 시 경고창이 나타나야 한다', async ({ page }) => {
    // 1. getUserMedia 권한 거부 강제 설정 (페이지 로드 전 실행)
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      };
    });

    // 2. 세션 시작 API Mocking
    await page.route('**/api/learning/sessions', (route) =>
      route.fulfill({
        status: 200,
        json: {
          sessionId: 999,
          currentQuestionCount: 1,
          remainedCredit: 20,
          question: {
            questionId: 1,
            content: '테스트 질문',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 180,
            guide: '가이드',
          },
        },
      }),
    );

    // 3. 페이지 진입 및 학습 시작
    await page.goto('/learning');
    await page.getByText('운영체제').click();
    await page.getByText('초급', { exact: true }).click();
    await page.getByRole('button', { name: '학습 시작하기' }).click();

    // 4. 브라우저 Alert 핸들링
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toBe('마이크 권한이 필요합니다.');
      await dialog.accept();
    });

    // 5. 녹음 버튼 클릭
    const micButton = page.getByRole('button', { name: '녹음 시작' });
    await expect(micButton).toBeVisible();
    await micButton.click();

    // 6. 검증: 상태가 변하지 않았는지 확인 (aria-label이 여전히 '녹음 시작')
    await expect(micButton).toHaveAttribute('aria-label', '녹음 시작');
  });

  /*
   * Tech-02: API 타임아웃 처리
   */
  test('API 응답이 30초 이상 지연될 경우 타임아웃 에러 처리가 되어야 한다', async ({ page }) => {
    test.setTimeout(60000); // 테스트 전체 타임아웃 연장

    // 1. 초기 데이터 진입 Mocking
    await page.route('**/api/learning/sessions', (route) =>
      route.fulfill({
        status: 200,
        json: {
          sessionId: 999,
          currentQuestionCount: 1,
          remainedCredit: 20,
          question: {
            questionId: 1,
            content: '질문',
            category: 'OS',
            difficulty: 'EASY',
            timeLimit: 180,
          },
        },
      }),
    );

    // 녹음 완료(STT) API Mocking
    await page.route(/\/api\/learning\/sessions\/.*\/record/, (route) =>
      route.fulfill({ status: 200, json: { sttText: '테스트 답변입니다.' } }),
    );

    // 2. 타임아웃 시뮬레이션 (제출 후 평가 요청 시)
    await page.route(/\/api\/learning\/sessions\/.*\/assess/, async (route) => {
      // assess 요청인지 확인 (stream 제외)
      if (route.request().url().includes('stream')) return route.continue();

      // 타임아웃 에러 발생
      await route.abort('timedout');
    });

    // 3. 진입 및 제출 시도
    await page.goto('/learning');
    await page.getByText('운영체제').click();
    await page.getByText('초급', { exact: true }).click();
    await page.getByRole('button', { name: '학습 시작하기' }).click();

    // 마이크 조작
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click({ force: true }); // 녹음 시작
    await page.waitForTimeout(500);
    await micButton.click({ force: true }); // 녹음 중지

    // 4. 제출 버튼 클릭
    await page.getByRole('button', { name: '답변 제출하기' }).click();

    // 5. 검증: 에러 처리 확인 (Toast 등)
    await expect(page.getByText(/시간 초과|에러|실패/)).toBeVisible();
  });

  /**
   * Tech-03: 중복 요청 방지 (Double-Click)
   */
  test('버튼을 빠르게 여러 번 클릭해도 API 요청은 한 번만 전송되어야 한다', async ({ page }) => {
    let requestCount = 0;

    // 세션 생성 API 카운팅
    await page.route('**/api/learning/sessions', async (route) => {
      requestCount++;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await route.fulfill({
        status: 200,
        json: { sessionId: 100, question: { content: '질문', category: 'OS', difficulty: 'EASY' } },
      });
    });

    await page.goto('/learning');
    await page.getByText('운영체제').click();
    await page.getByText('초급', { exact: true }).click();

    const startButton = page.getByRole('button', { name: '학습 시작하기' });

    // 2. 광클 시뮬레이션
    await startButton.click({ clickCount: 3 });

    // 3. 검증
    // 버튼이 로딩 상태(disabled)로 변했는지 확인
    await expect(startButton).toBeDisabled();

    // 요청이 1번만 갔는지 확인
    expect(requestCount).toBe(1);
  });

  /**
   * Tech-04: 중복 로그인 세션 차단
   */
  test('다른 기기에서 로그인하여 세션이 만료될 경우 로그아웃 처리되어야 한다', async ({ page }) => {
    // 1. users/me 요청 시 409 Conflict 발생 Mocking
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 409,
        json: { message: '다른 기기에서 접속하여 로그아웃됩니다.' },
      }),
    );

    // 2. Alert 감지 준비 (페이지 이동 전에 설정)
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('로그아웃'); // 실제 메시지에 맞게 수정
      await dialog.accept();
    });

    // 3. 페이지 이동 (이때 users/me 호출 -> 409 발생 -> 로그아웃 로직 동작)
    await page.goto('/learning');

    // 4. 검증: 로그인 페이지로 튕겼는지 확인
    await expect(page).toHaveURL(/\/login/);
  });
});
