import { expect, test } from '@playwright/test';

test.describe('1. 🔐 인증 및 유효성 검사 (Auth & Validation)', () => {
  test.beforeEach(async ({ page }) => {
    // 모든 테스트 시작 전 로그인/회원가입 진입점 설정
    await page.goto('/login');
  });

  /**
   * Auth-01: 서비스 이용 동의 (Agreement) [New]
   * - 체크박스 동기화 로직 (전체 동의 <-> 개별 동의)
   * - 필수 항목 체크 시 버튼 활성화
   * - 약관 모달 호출
   * - 다음 페이지(회원가입) 이동
   */
  test('서비스 이용 동의: 약관 체크 로직 및 회원가입 페이지 이동을 검증한다', async ({ page }) => {
    await page.goto('/register'); // 혹시 register로 바로 접근해도
    // (만약 리다이렉트 로직이 있다면 여기서 agreement로 튕기겠지만, 현재는 없으므로 직접 이동)
    await page.goto('/agreement');

    const allAgreeCheckbox = page.getByText('약관 전체 동의하기');
    const serviceCheckbox = page.getByText('[필수] 서비스 이용약관 동의'); // Label 텍스트로 찾기
    const privacyCheckbox = page.getByText('[필수] 개인정보 수집 및 이용 동의');
    const nextButton = page.getByRole('button', { name: '다음으로' });

    // 1. 초기 상태: 버튼 비활성화 확인
    await expect(nextButton).toBeDisabled();

    // 2. 전체 동의 클릭 -> 모든 체크박스 활성화 & 버튼 활성화
    await allAgreeCheckbox.click();
    await expect(nextButton).toBeEnabled();

    // 3. 개별 항목 해제 시 -> 전체 동의 해제 & 버튼 비활성화 확인
    await serviceCheckbox.click(); // 해제
    // 전체 동의 체크박스가 해제되었는지 확인 (input 상태 확인이 어려우면 버튼 상태로 간접 확인)
    await expect(nextButton).toBeDisabled();

    // 4. 다시 필수 항목 모두 체크 -> 버튼 활성화
    await serviceCheckbox.click();
    await expect(nextButton).toBeEnabled();

    // 5. 약관 모달(Dialog) 호출 테스트
    await page.locator('button', { hasText: '보기' }).first().click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('서비스 이용약관')).toBeVisible();
    await modal.getByRole('button', { name: '확인' }).click(); // 모달 닫기
    await expect(modal).not.toBeVisible();

    // 6. 다음 페이지 이동
    await nextButton.click();
    await expect(page).toHaveURL('/register');
  });

  /**
   * Auth-02: 회원가입 입력 유효성 검사 (실패)
   */
  test('회원가입 시 유효하지 않은 값을 입력하면 에러 메시지가 노출되어야 한다', async ({
    page,
  }) => {
    await page.goto('/register');

    // 1. 필수 값 미입력 상태로 가입 버튼 클릭 시도
    const submitButton = page.getByRole('button', { name: '가입하기' });
    await submitButton.click();

    // 검증: 필수 입력 에러 메시지 확인 (Zod 등 라이브러리 메시지 기준)
    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible();

    // 2. 유효하지 않은 이메일 형식 입력
    await page.getByLabel('이메일').fill('invalid-email');
    await expect(page.getByText('이메일 형식이 올바르지 않습니다')).toBeVisible();

    // 3. 유효하지 않은 닉네임 형식 입력
    await page.getByLabel('닉네임').fill('a');
    await expect(page.getByText('닉네임은 2글자 이상이어야 합니다.')).toBeVisible();

    await page.getByLabel('닉네임').fill('abcdefghijk');
    await expect(page.getByText('닉네임은 10글자 이하여야 합니다.')).toBeVisible();

    // 3. 비밀번호 8자 미만 검사
    const passwordInput = page.getByLabel('비밀번호', { exact: true });
    await passwordInput.fill('short');
    await expect(page.getByText('비밀번호는 8자 이상이어야 합니다')).toBeVisible();

    // 4. 비밀번호 규칙 위반 (특수문자 미포함 등)
    await passwordInput.fill('onlyletters123');
    await expect(page.getByText('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다')).toBeVisible();

    // 5. 비밀번호 확인 불일치 검사
    await passwordInput.fill('CorrectPass!123');
    const passwordConfirmInput = page.getByLabel('비밀번호 확인');
    await passwordConfirmInput.fill('DifferentPass!456');
    await expect(page.getByText(/비밀번호가.*일치하지.*않습니다/)).toBeVisible();
  });

  /**
   * Auth-03: 중복 확인 로직 (성공/실패)
   */
  test('닉네임(Debounce) 및 이메일(onBlur) 중복 여부에 따라 메시지가 노출되어야 한다', async ({
    page,
  }) => {
    await page.goto('/register');

    // --- 1. 이메일 중복 확인 (onBlur 방식) ---
    // 이메일 중복 시나리오 Mocking
    await page.route('**/api/users/check-duplicate?type=email*', async (route) => {
      await route.fulfill({ status: 200, json: { isDuplicate: true } });
    });

    const emailInput = page.getByLabel('이메일');
    await emailInput.fill('duplicate@test.com');

    // blur() 호출 시점에 API가 트리거됨
    await emailInput.blur();
    await expect(page.getByText('이미 사용 중인 이메일입니다.')).toBeVisible();

    // 이메일 사용 가능 시나리오 Mocking으로 변경
    await page.route('**/api/users/check-duplicate?type=email*', async (route) => {
      await route.fulfill({ status: 200, json: { isDuplicate: false } });
    });

    await emailInput.fill('available@test.com');
    await emailInput.blur();
    await expect(page.getByText('사용 가능한 이메일입니다.')).toBeVisible();

    // --- 2. 닉네임 중복 확인 (Debounce 방식) ---
    // 닉네임 중복 시나리오 Mocking
    await page.route('**/api/users/check-duplicate?type=nickname*', async (route) => {
      await route.fulfill({ status: 200, json: { isDuplicate: true } });
    });

    const nicknameInput = page.getByLabel('닉네임');
    await nicknameInput.fill('중복닉네임');

    // 코드가 1000ms 타이머를 가지고 있으므로, 넉넉하게 기다려줌
    await page.waitForTimeout(1100);
    await expect(page.getByText('이미 사용 중인 닉네임입니다.')).toBeVisible();

    // 닉네임 사용 가능 시나리오 Mocking
    await page.route('**/api/users/check-duplicate?type=nickname*', async (route) => {
      await route.fulfill({ status: 200, json: { isDuplicate: false } });
    });

    await nicknameInput.fill('좋은닉네임');
    await page.waitForTimeout(1100);
    await expect(page.getByText('사용 가능한 닉네임입니다.')).toBeVisible();
  });

  /**
   * Auth-03: 로그인 실패 처리 (유효성 검사 및 서버 에러)
   */
  test('로그인 시 유효성 검사 실패 및 잘못된 계정 입력 시 에러 메시지가 노출되어야 한다', async ({
    page,
  }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('example@email.com');
    const passwordInput = page.getByPlaceholder('비밀번호를 입력해주세요');
    const loginButton = page.getByRole('button', { name: '로그인' });

    // 1. 이메일을 입력하지 않고 로그인 시도 (필수 입력 검사)
    await loginButton.click();
    await expect(page.getByText('이메일을 입력해주세요.')).toBeVisible();

    // 2. 올바르지 않은 이메일 형식 입력 (형식 검사)
    await emailInput.fill('not-an-email');
    // onChange나 onBlur 시점에 에러가 노출되므로 버튼을 누르거나 포커스를 이동합니다.
    await loginButton.click();
    await expect(page.getByText('이메일 형식이 올바르지 않습니다.')).toBeVisible();

    // 3. 비밀번호 미입력 검사
    await emailInput.fill('test@example.com');
    await passwordInput.fill('');
    await loginButton.click();
    await expect(page.getByText('비밀번호를 입력해주세요.')).toBeVisible();

    // 4. 서버 응답 실패 (401 Unauthorized) 시나리오 Mocking
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        json: { message: '이메일 또는 비밀번호가 일치하지 않습니다' },
      });
    });

    await emailInput.fill('wrong@test.com');
    await passwordInput.fill('wrongpassword123!');
    await loginButton.click();

    // 검증: 서버에서 내려준 에러 메시지가 화면에 노출되는지 확인
    await expect(page.getByText('이메일 또는 비밀번호가 일치하지 않습니다')).toBeVisible();
  });

  /**
   * Auth-04: 로그인 성공
   */
  test('로그인 성공 시 메인 페이지로 이동하고 유저 정보를 조회하여 저장하여야한다.', async ({
    page,
  }) => {
    // 1. 가짜 유저 데이터 정의
    const mockUserInfo = {
      profile: {
        nickname: 'YeonShin',
        profileImage: null,
        bio: '테스트 계정입니다.',
      },
      progression: {
        level: 5,
        currentXp: 1250,
        requiredXpForNextLevel: 2000,
        lp: 450,
      },
      studyStats: {
        solvedProblemCount: 120,
        streak: 7,
        totalStudyTime: 36000, // 10시간
      },
      social: {
        followerCount: 10,
        followCount: 15,
      },
      remainingCredit: 20,
    };

    // 2. API Mocking: 로그인 성공
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: { accessToken: 'fake_access_token' },
      });
    });

    // 3. API Mocking: 내 정보 조회 (Swagger 명세 반영)
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        json: mockUserInfo,
      });
    });

    // 4. 로그인 동작 수행
    await page.goto('/login');
    await page.getByPlaceholder('example@email.com').fill('success@test.com');
    await page.getByPlaceholder('비밀번호를 입력해주세요').fill('Password123!');
    await page.getByRole('button', { name: '로그인' }).click();

    // 5. 검증: 페이지 이동 및 데이터 렌더링 확인
    await expect(page).toHaveURL('/');

    // 사이드바/대시보드 내 닉네임 확인
    await expect(page.getByText('YeonShin')).toBeVisible();
  });
});
