import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { checkEmailDuplicate, checkNicknameDuplicate, registerUser } from '@/apis/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { FormInput } from '@/features/auth/components/FormInput';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { type RegisterFormDto, RegisterFormSchema } from '@repo/shared/schemas/auth';
import { type BackendErrorResponse } from '@repo/shared/types/error';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { isAxiosError } from 'axios';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [emailChecked, setEmailChecked] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    trigger,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormDto>({
    resolver: zodResolver(RegisterFormSchema),
    mode: 'onChange',
  });

  const nicknameValue = watch('nickname');
  const emailValue = watch('email');

  useEffect(() => {
    if (!nicknameValue || nicknameValue.length < 2) return;
    const timer = setTimeout(async () => {
      const isSyntaxValid = await trigger('nickname');

      if (isSyntaxValid) {
        try {
          const { isDuplicate } = await checkNicknameDuplicate(nicknameValue);

          if (isDuplicate) {
            setError('nickname', {
              type: 'manual',
              message: '이미 사용 중인 닉네임입니다.',
            });
          } else {
            clearErrors('nickname');
          }
        } catch (error) {
          setError('nickname', {
            type: 'manual',
            message: '닉네임 확인 중 오류가 발생했습니다.',
          });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nicknameValue, trigger, setError, clearErrors]);

  // 이메일 중복검사 블러
  const handleEmailBlur = async () => {
    if (!emailValue) return;

    // 이메일 형식이 아니면 중복 검사 안 함
    const isValidFormat = await trigger('email');
    if (!isValidFormat) return;

    try {
      const { isDuplicate } = await checkEmailDuplicate(emailValue);
      if (isDuplicate) {
        setError('email', {
          type: 'manual',
          message: '이미 사용 중인 이메일입니다.',
        });
        setEmailChecked(false);
      } else {
        clearErrors('email');
        setEmailChecked(true);
      }
    } catch (error) {
      setError('email', {
        type: 'manual',
        message: '이메일 확인 중 오류가 발생했습니다.',
      });
    }
  };

  const {
    onBlur: rhfOnBlur,
    ref,
    ...emailRest
  } = register('email', {
    onChange: () => setEmailChecked(false),
  });

  const onSubmit = async (data: RegisterFormDto) => {
    if (!emailChecked) {
      setError('email', {
        type: 'manual',
        message: '이메일 중복 확인을 해주세요.',
      });
      setFocus('email');
      return;
    }

    try {
      await registerUser(data);
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate({ to: '/login' });
    } catch (error) {
      // 백엔드에서 던진 에러라면 (서버에러 제외)
      if (isAxiosError<BackendErrorResponse>(error) && error.response) {
        const { status, data: errorData } = error.response;

        // 409: 이미 가입된 유저
        if (status === 409) {
          alert(errorData.message || '이미 가입된 회원 정보가 존재합니다.');
        }
        // 400: 유효성 검증 (서버)
        else if (status === 400 && errorData.errors) {
          // 백엔드에서 내려준 필드별 에러를 폼에 표시
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            setError(field as any, {
              type: 'server',
              message: messages[0],
            });
          });
        } else {
          setError('root', {
            type: 'server',
            message: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      } else {
        setError('root', {
          type: 'network',
          message: '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.',
        });
      }
    }
  };

  return (
    <AuthLayout>
      <AuthHeader title="회원가입" description="Talk It과 함께 CS 학습을 시작해보세요" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 이메일 */}
        <FormInput
          label="이메일"
          placeholder="example@email.com"
          type="email"
          error={errors.email}
          {...emailRest}
          ref={ref}
          onBlur={async (e) => {
            rhfOnBlur(e);
            await handleEmailBlur();
          }}
          // 성공 메시지 주입
          bottomMessage={
            emailChecked && (
              <p className="flex items-center gap-1 text-xs text-light-green">
                <Check size={12} /> 사용 가능한 이메일입니다.
              </p>
            )
          }
        />

        {/* 닉네임 */}
        <FormInput
          label="닉네임"
          placeholder="2~10자 이내"
          error={errors.nickname}
          {...register('nickname')}
          bottomMessage={
            !errors.nickname &&
            nicknameValue?.length >= 2 && (
              <div className="flex items-center gap-1 text-primary">
                <Check size={12} />
                <span className="text-xs">사용 가능한 닉네임입니다.</span>
              </div>
            )
          }
        />

        {/* 비밀번호 */}
        <FormInput
          label="비밀번호"
          type="password"
          placeholder="영문, 숫자, 특수문자 포함 8자 이상"
          error={errors.password}
          {...register('password')}
        />

        {/* 비밀번호 확인 */}
        <FormInput
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 한번 입력해주세요"
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        {/* 가입하기 버튼 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:bg-primary/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>가입 처리 중...</span>
            </>
          ) : (
            '가입하기'
          )}
        </button>
        {errors.root && (
          <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errors.root.message}</span>
          </div>
        )}
      </form>

      <div className="mt-8 text-center text-sm text-dark-gray">
        이미 계정이 있으신가요?
        <Link to="/login" className="font-semibold text-primary hover:text-primary hover:underline">
          로그인
        </Link>
      </div>
    </AuthLayout>
  );
};

export const Route = createFileRoute('/_public/register')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/', replace: true });
    }
  },
  component: RegisterPage,
});
