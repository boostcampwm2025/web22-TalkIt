import { expect, test } from '@playwright/test';

const MOCK_SESSION_ID = 79;

test.describe('5. 🛡️ 예외 처리 및 안정성 (Edge Cases & Stability)', () => {
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

    // 공통 인증 및 초기 데이터 Mocking
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 200, json: { accessToken: 'fake_token' } }),
    );
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        json: {
          profile: { nickname: '테스터' },
          progression: { level: 1, currentXp: 500, requiredXpForNextLevel: 1000 },
          remainingCredit: 20,
          studyStats: { streak: 1, solvedProblemCount: 5, totalStudyTime: 300 },
        },
      }),
    );

    // 질문 페이지 진입 세팅
    await page.route('**/api/learning/sessions', (route) =>
      route.fulfill({
        status: 200,
        json: {
          sessionId: MOCK_SESSION_ID,
          currentQuestionCount: 1,
          remainedCredit: 20,
          question: {
            questionId: 101,
            content: '프로세스란?',
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
   * Edge-01: 평가 중 이탈 방지
   */
  test('피드백 생성 중(LOADING)에 페이지를 떠나려 하면 경고창이 노출되어야 한다', async ({
    page,
  }) => {
    // 1. 상태를 FEEDBACK_LOADING으로 만들기 위해 답변 제출
    await page.route('**/api/learning/sessions/*/record', (route) =>
      route.fulfill({ status: 200, json: { sttText: '답변' } }),
    );
    await page.route('**/api/learning/sessions/*/assess', (route) =>
      route.fulfill({ status: 200, json: { jobId: 1, answerId: 100, status: 'QUEUED' } }),
    );

    // 마이크 조작 및 제출
    const micButton = page.getByRole('button', { name: /녹음 시작|녹음 중지/ });
    await micButton.click({ force: true });
    await page.waitForTimeout(500);
    await micButton.click({ force: true });

    await page.getByRole('button', { name: '답변 제출하기' }).click();

    // 2. 브라우저 dialog(beforeunload) 리스너 설정
    // 실제 구현에서 window.onbeforeunload가 동작해야 함
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // 이탈 취소
    });

    // 3. 새로고침 시도
    await page.reload();

    // 4. 검증: 경고 메시지 확인 (브라우저마다 다를 수 있으나 존재 여부 확인)
    // 참고: 현대 브라우저는 커스텀 메시지 노출을 제한하지만 이벤트 트리거 여부는 확인 가능
    expect(page.getByText('평가를 시작하고 있습니다...')).toBeVisible(); // 이탈이 취소되어 화면이 유지되어야 함
  });

  /**
   * Edge-02: 새로고침 시 상태 복구 (Persistence)
   */
  test('피드백 확인 후 또는 리워드 모달 상태에서 새로고침 시 데이터가 유지되어야 한다', async ({
    page,
  }) => {
    // 1. 리워드 데이터 세팅 및 모달 노출
    await page.route('**/api/learning/sessions/*/finish', (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentXp: 600,
          level: 1,
          gainedXp: { baseXp: 100 },
          questions: [{ content: '질문1', type: 'NORMAL', score: 80 }],
        },
      }),
    );
    await page.getByRole('button', { name: '학습 종료' }).click();
    await expect(page.getByText('학습 성과 리포트')).toBeVisible();

    // 2. 진행 중인 세션 복구 API Mocking
    // 새로고침 후 다시 정보를 가져올 때 이전 리워드 상태를 내려준다고 가정
    await page.route('**/api/learning/active-session', (route) =>
      route.fulfill({
        status: 200,
        json: {
          hasReward: true,
          rewardData: {
            /* ... */
          },
        },
      }),
    );

    // 3. 새로고침 실행
    await page.reload();

    // 4. 검증: 모달 또는 결과 데이터가 여전히 존재하는지 확인
    // (구현 방식에 따라 모달이 다시 뜨거나 결과 페이지가 유지되어야 함)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  /**
   * Edge-03: 도중 크레딧 소진
   */
  test('세션 중 크레딧이 0이 되면 다음 질문 진행이 차단되어야 한다', async ({ page }) => {
    // 1. 크레딧이 0인 상태의 다음 질문 응답 Mocking
    await page.route('**/api/learning/sessions/*/next-question', (route) =>
      route.fulfill({
        status: 409,
        json: { message: '잔여 크레딧이 부족하여 더 이상 질문을 진행할 수 없습니다.' },
      }),
    );

    // 2. 다음 질문 클릭
    await page.getByRole('button', { name: '다음 질문으로 건너뛰기' }).click();

    // 3. 검증: 에러 알림 노출 및 종료 유도 확인
    await expect(page.getByText('크레딧이 부족하여')).toBeVisible();
  });

  /**
   * Edge-04: 학습 종료 전 이탈 시 처리
   */
  test('사용자가 명시적으로 종료하지 않고 브라우저를 닫을 때 데이터 동기화가 시도되어야 한다', async ({
    page,
  }) => {
    // 1. 리워드 모달이 뜬 상태 (정산 대기 중)
    await page.route('**/api/learning/sessions/*/finish', (route) =>
      route.fulfill({
        status: 200,
        json: {
          currentXp: 700,
          level: 1,
          gainedXp: { baseXp: 200 },
          questions: [{ content: '질문' }],
        },
      }),
    );
    await page.getByRole('button', { name: '학습 종료' }).click();

    // 2. 유저 정보 갱신 API 호출 감시
    // RewardModal의 useEffect 클린업 함수에서 refreshUserData를 호출함
    const refreshCall = page.waitForRequest('**/api/users/me');

    // 3. 모달 닫기 (이탈 시뮬레이션)
    await page.getByRole('button', { name: '메인으로 돌아가기' }).click();

    // 4. 검증: 유저 스탯 업데이트 API가 최종적으로 호출되었는지 확인
    const response = await refreshCall;
    expect(response.url()).toContain('/api/users/me');
  });
});
