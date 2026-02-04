import { type Page, type Route, expect, test } from '@playwright/test';

// 공통 API Mocking 데이터
const mockUserInfo = {
  profile: { nickname: 'test', profileImage: null, bio: '테스트' },
  progression: { level: 5, currentXp: 1200, requiredXpForNextLevel: 2000, lp: 450 },
  studyStats: { solvedProblemCount: 120, streak: 7, totalStudyTime: 36000 },
  remainingCredit: 20,
};

test.describe('2. 🏫 학습 대시보드 및 세션 설정 (Learning Setup)', () => {
  test.beforeEach(async ({ page }) => {
    // 앱 초기화 및 로그인 상태 Mocking
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({ status: 200, json: { accessToken: 'fake_token' } });
    });

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({ status: 200, json: mockUserInfo });
    });

    await page.goto('/learning');
  });

  /**
   * Setup-01: 메인 진입 및 통계 확인
   */
  test('대시보드 진입 시 사이드 바와 메인 통계에 유저 정보가 정확히 표시되어야 한다', async ({
    page,
  }) => {
    // 1. 닉네임 및 환영 문구 확인
    await expect(page.getByText('안녕하세요, test님!')).toBeVisible();

    // 2. 스트릭 확인
    await expect(page.getByText('연속 7일 학습 중')).toBeVisible();

    // 3. 통계 데이터 확인 (누적 답변, 학습 시간)
    await expect(page.getByText('120개').first()).toBeVisible(); // solvedProblemCount
    await expect(page.getByText('600분').first()).toBeVisible(); // 36000초 / 60

    // 4. XP 프로그레스 바 확인 (useProgressAnimation 반영)
    // 1200/2000 = 60% 가 텍스트로 노출되는지 확인
    await expect(page.getByText('60%')).toBeVisible();
    await expect(page.getByText('1200 / 2000 XP')).toBeVisible();
    await expect(page.getByText('다음 레벨: 6 Lv')).toBeVisible();

    const sideBar = page.locator('aside');
    await expect(sideBar.getByText('test')).toBeVisible();
    await expect(sideBar.getByText('Level 5 • 1200 XP')).toBeVisible();
  });

  /**
   * Setup-02: 신규 학습 시작 프로세스
   */
  test('주제와 난이도를 선택하면 학습 시작 버튼이 활성화되고 페이지가 이동해야 한다', async ({
    page,
  }) => {
    await page.route('**/learning/sessions/active-session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { hasSession: false, sessionId: null },
      });
    });

    // 1. 초기 상태: 난이도 설정 및 시작 버튼은 보이지 않아야 함 (opacity-0)
    const difficultySection = page.locator('section:has-text("난이도 설정")');
    const startSection = page.locator('section:has-text("오늘의 AI 튜터가 준비되었습니다.")');

    await expect(difficultySection).toHaveClass(/opacity-0/);

    // 2. 주제 선택 (운영체제)
    await page.getByText('운영체제').click();
    await expect(difficultySection).toHaveClass(/opacity-100/);

    // 3. 난이도 선택 (중급)
    await page.getByText('중급', { exact: true }).click();
    await expect(startSection).toHaveClass(/opacity-100/);

    // 4. API Mocking: 세션 생성
    await page.route('**/api/learning/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          sessionId: 79,
          currentQuestionCount: 1,
          remainedCredit: 19,
          question: {
            questionId: 485,
            content: "'대기 상태' 프로세스의 주된 목적은 무엇인가요?",
            guide: '자원 해제 중심',
            category: 'OS',
            difficulty: 'MEDIUM',
            timeLimit: 180,
          },
        },
      });
    });

    // 5. 학습 시작하기 클릭
    await page.getByRole('button', { name: '학습 시작하기' }).click();

    // 6. 결과 확인: 질문 페이지로 이동
    await expect(page).toHaveURL(/\/learning\/question/);
  });

  /**
   * Setup-03: 진행 중인 세션 이어하기
   */
  test.describe('진행 중인 세션 이어하기', () => {
    test.beforeEach(async ({ page }) => {
      // 1. 진행 중인 세션 정보 Mocking
      await page.route('**/api/learning/sessions/active-session', async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            hasSession: true,
            sessionId: 99,
            currentQuestionCount: 2,
          },
        });
      });

      // 2. 세션 이어하기 데이터 Mocking
      await page.route('**/api/learning/sessions/99', async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            sessionId: 99,
            currentQuestionCount: 2,
            remainedCredit: 20,
            question: {
              questionId: 501,
              content: 'TCP와 UDP의 차이점에 대해 설명해주세요.',
              guide: '연결 지향성',
              category: 'NETWORK',
              difficulty: 'MEDIUM',
              timeLimit: 300,
            },
          },
        });
      });
    });

    test('진행 중인 세션이 있을 때 이어하기 모달이 뜨고, 승인 시 질문 페이지로 이동한다', async ({
      page,
    }) => {
      await page.goto('/learning');

      await expect(page.getByRole('dialog')).toBeHidden();

      await page.getByText('네트워크').click();
      await expect(page.getByText('난이도 설정')).toBeVisible();

      await page.getByText('중급').click();

      await page.getByRole('button', { name: '학습 시작하기' }).click();

      // 3. Radix UI Dialog 노출 확인
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('진행 중인 학습이 있습니다')).toBeVisible();

      // 4. '이어하기' 버튼 클릭
      const resumeButton = dialog.getByRole('button', { name: '이어하기' });
      await resumeButton.click();

      // 5. 검증: 모달이 닫히고 질문 페이지로 이동했는지 확인
      await expect(dialog).not.toBeVisible();
      await expect(page).toHaveURL(/\/learning\/question/);

      // 6. 데이터 연동 확인: Mocking한 질문이 화면에 보이는가?
      await expect(page.getByText('TCP와 UDP의 차이점에 대해 설명해주세요.')).toBeVisible();
    });
  });

  /**
   * Setup-04: 크레딧 소진 시 차단
   */
  test('크레딧이 0일 경우 학습 시작 시 차단되어야 한다', async ({ page }) => {
    // 1. 크레딧 0 상태로 Mock 데이터 재설정
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: { ...mockUserInfo, remainingCredit: 0 },
      });
    });
    await page.reload();

    // 2. 주제 및 난이도 선택
    await page.getByText('네트워크').click();
    await page.getByText('초급').click();

    // 3. 시작 버튼 클릭 시도
    const startButton = page.getByRole('button', { name: '학습 시작하기' });

    await page.route('**/api/learning/sessions', async (route) => {
      await route.fulfill({
        status: 409,
        json: { message: '잔여 크레딧이 부족하여 세션을 진행할 수 없습니다.' },
      });
    });

    await startButton.click();
    await expect(page.getByText('잔여 크레딧이 부족하여 세션을 진행할 수 없습니다.')).toBeVisible();
  });
});
