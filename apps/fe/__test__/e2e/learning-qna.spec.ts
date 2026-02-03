import { expect, test } from '@playwright/test';

const MOCK_SESSION_DATA = {
  sessionId: 79,
  currentQuestionCount: 1,
  remainedCredit: 20,
  question: {
    questionId: 485,
    content: "'대기 상태' 프로세스의 주된 목적은 무엇인가요?",
    guide: '자원 해제, 신호 대기, 효율적 관리를 중심으로 답변해보세요.',
    category: 'OS',
    difficulty: 'EASY',
    timeLimit: 180,
  },
};

test.describe('3. 🎤 질문 및 답변 인터랙션 (Question & Answer)', () => {
  test.beforeEach(async ({ page }) => {
    // 2. 가짜 오디오 스트림 주입 스크립트
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

    // 1. 공통 API Mocking
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { accessToken: 'fake_token' } }),
    );
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        json: {
          profile: { nickname: '테스터' },
          progression: { level: 1, currentXp: 0, requiredXpForNextLevel: 1000 },
          studyStats: { streak: 1, solvedProblemCount: 5, totalStudyTime: 300 },
          remainingCredit: 20,
        },
      }),
    );

    // 2. 세션 시작 API Mocking
    await page.route('**/api/learning/sessions', (route) =>
      route.fulfill({ status: 200, json: MOCK_SESSION_DATA }),
    );

    // 3. 바로 /question으로 가면 스토어가 비어있어 리다이렉트되므로
    // /learning 페이지에서 실제 흐름을 타고 진입합니다.
    await page.goto('/learning');
    await page.getByText('운영체제').click();
    await page.getByText('초급', { exact: true }).click();
    await page.getByRole('button', { name: '학습 시작하기' }).click();

    // /learning/question 페이지 로딩 완료 대기
    await expect(page).toHaveURL(/\/learning\/question/);
  });

  /**
   * QnA-01: 질문 UI 데이터 바인딩
   */
  test('질문 페이지 UI가 DTO 데이터와 정확히 일치해야 한다', async ({ page }) => {
    // 1. 헤더 바인딩 확인
    await expect(page.getByText('운영체제').first()).toBeVisible();
    await expect(page.getByText('초급', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('20', { exact: true })).toBeVisible();

    // 2. 본문 바인딩 확인
    await expect(page.getByText('질문 1')).toBeVisible();
    await expect(page.getByText(MOCK_SESSION_DATA.question.content)).toBeVisible();

    // 3. 타이머 및 가이드 확인
    await expect(page.getByText('03:00')).toBeVisible();
    const hintCard = page.locator('.flip-card');
    await hintCard.click();
    await expect(page.getByText(MOCK_SESSION_DATA.question.guide)).toBeVisible();
  });

  /**
   * QnA-02: 녹음 및 STT 변환 흐름
   */
  test('음성 녹음 후 STT 변환 결과가 화면에 표시되어야 한다', async ({ page }) => {
    // 1. 녹음 시작
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });

    await expect(micButton).toHaveAttribute('aria-label', '녹음 시작');

    await micButton.click();

    await expect(micButton).toHaveAttribute('aria-label', '녹음 중지', { timeout: 5000 });

    // 2. 녹음 종료 및 STT API Mocking
    await page.route('**/api/learning/sessions/*/record', async (route) => {
      // 의도적으로 약간의 지연을 주어 로딩 UI를 확실히 확인하게 할 수도 있습니다.
      await new Promise((f) => setTimeout(f, 500));
      await route.fulfill({
        status: 200,
        json: { sttText: '테스트 STT 결과입니다.' },
      });
    });

    await micButton.click();

    // 3. 결과 확인
    await expect(page.getByText('AI가 음성을 텍스트로 변환하고 있어요')).toBeVisible();
    await expect(page.getByText('테스트 STT 결과입니다.')).toBeVisible();
  });

  /**
   * QnA-03: STT 결과 수정
   */
  test('STT 결과 텍스트를 사용자가 직접 수정할 수 있어야 한다', async ({ page }) => {
    // STT 완료 상태 시뮬레이션
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '원본 답변' } }),
    );
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click(); // 시작
    await expect(micButton).toHaveAttribute('aria-label', '녹음 중지');

    await micButton.click();

    // 수정 로직 검증
    await page.getByRole('button', { name: '수정', exact: true }).click();
    const textarea = page.locator('textarea');
    await textarea.fill('수정된 내용');
    await page.getByRole('button', { name: '수정 완료' }).click();

    await expect(page.getByText('수정된 내용')).toBeVisible();
  });

  /**
   * QnA-04: 답변 제출 및 차단
   */
  test('답변 제출 시 로직 검증', async ({ page }) => {
    // 1. 답변 없는 상태 차단 확인
    const submitButton = page.getByRole('button', { name: '답변 제출하기' });
    await expect(submitButton).toBeDisabled();

    // 2. 답변 생성 후 제출
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '제출용 답변' } }),
    );

    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });

    await micButton.click(); // 시작
    await expect(micButton).toHaveAttribute('aria-label', '녹음 중지');

    await micButton.click(); // 종료

    await page.route('**/api/learning/sessions/*/assess', (route) =>
      route.fulfill({ status: 200, json: { answerId: 100, status: 'QUEUED' } }),
    );

    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await expect(page.getByText('평가를 시작하고 있습니다...')).toBeVisible();
  });
});
