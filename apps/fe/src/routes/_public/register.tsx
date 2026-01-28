import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { FormInput } from '@/features/auth/components/FormInput';
import { type CreateUserDto, CreateUserSchema } from '@/features/auth/schemas/register-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Check } from 'lucide-react';

const RegisterPage = () => {
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
  } = useForm<CreateUserDto>({
    resolver: zodResolver(CreateUserSchema),
    mode: 'onChange',
  });

  const handleCheckEmail = async () => {
    const email = watch('email');
    const isValidFormat = await trigger('email');
    if (!isValidFormat || !email) return;

    clearErrors('email');
    setEmailChecked(true);
  };

  const onSubmit = (data: CreateUserDto) => {
    if (!emailChecked) {
      setError('email', {
        type: 'manual',
        message: '이메일 중복 확인을 해주세요.',
      });
      setFocus('email');
      return;
    }
    // todo: 실제 API 연동 후 console.log 제거(lint 검사 때문에 넣었습니다)
    console.log(data);
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
          {...register('email', { onChange: () => setEmailChecked(false) })}
          // 중복확인 버튼 주입
          actionButton={
            <button
              type="button"
              onClick={handleCheckEmail}
              className="rounded-lg border border-gray bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-dark-gray hover:bg-gray active:bg-gray"
            >
              중복확인
            </button>
          }
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

        {/* 약관 동의 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('termsAgreed')}
              type="checkbox"
              id="terms"
              className="h-4 w-4 rounded border-gray text-primary focus:ring-primary"
            />
            <label htmlFor="terms" className="text-sm text-dark-gray">
              <span className="cursor-pointer text-primary underline">이용약관</span> 및
              <span className="cursor-pointer text-primary underline">개인정보처리방침</span>에
              동의합니다.
            </label>
          </div>
          {errors.termsAgreed && <p className="text-xs text-alert">{errors.termsAgreed.message}</p>}
        </div>

        {/* 가입하기 버튼 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:bg-primary/30"
        >
          가입하기
        </button>
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
  component: RegisterPage,
});
