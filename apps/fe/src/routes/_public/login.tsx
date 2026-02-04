import { useForm } from 'react-hook-form';

import { loginUser } from '@/apis/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { FormInput } from '@/features/auth/components/FormInput';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { useUserStore } from '@/lib/stores/user-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginDto, LoginSchema } from '@repo/shared/schemas/auth';
import type { BackendErrorResponse } from '@repo/shared/types/error';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { isAxiosError } from 'axios';
import { AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();

  const authStore = useAuthStore.getState();
  const userStore = useUserStore.getState();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      const response = await loginUser(data);
      const accessToken = response.accessToken;
      const userInfo = response.user;

      authStore.setAccessToken(accessToken);
      userStore.setUserInfo(userInfo);

      navigate({ to: '/', replace: true });

      // 스토어에 토큰 저장
    } catch (error) {
      if (isAxiosError<BackendErrorResponse>(error) && error.response) {
        const { status } = error.response;

        // 401 Unauthorized: 이메일 또는 비밀번호 불일치
        if (status === 401) {
          setError('password', {
            type: 'manual',
            message: '이메일 또는 비밀번호가 일치하지 않습니다.',
          });
        } else {
          // 500 등 기타 서버 에러
          setError('root', {
            type: 'server',
            message: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      } else {
        // 네트워크 에러 등
        setError('root', {
          type: 'network',
          message: '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.',
        });
      }
      return;
    }
  };
  return (
    <AuthLayout>
      <AuthHeader
        title={
          <>
            <span className="text-primary">Talk It</span> 에 오신 것을 환영합니다
          </>
        }
        description="오늘도 즐겁게 말하면서 학습해볼까요?"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormInput
          label="이메일"
          placeholder="example@email.com"
          type="email"
          error={errors.email}
          {...register('email')}
        />

        <FormInput
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력해주세요"
          error={errors.password}
          {...register('password')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:bg-primary/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>로그인 중...</span>
            </>
          ) : (
            '로그인'
          )}
        </button>

        {errors.root && (
          <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-alert">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}

        {/* Note: 현재는 소셜 로그인 미구현이라 주석처리 해둠. */}
        {/* <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-dark-gray">또는 소셜 계정으로 시작하기</span>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-gray bg-white text-black transition-colors hover:bg-gray focus:ring-2 focus:ring-gray focus:outline-none"
            aria-label="GitHub로 로그인"
          >
            <Github size={24} />
          </button>
        </div> */}
      </form>

      <div className="mt-8 text-center text-sm text-dark-gray">
        아직 계정이 없으신가요?
        <Link
          to="/agreement"
          className="font-semibold text-primary hover:text-primary hover:underline"
        >
          회원가입
        </Link>
      </div>
    </AuthLayout>
  );
};

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
});
