import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { PRIVACY_POLICY, SERVICE_TERMS } from '@/constants/terms';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { TermsModal } from '@/features/auth/components/TermsModal';
import { useAuthStore } from '@/lib/stores/user-auth-store';
import { cn } from '@/lib/utils';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

import { Check, ChevronRight } from 'lucide-react';

type AgreementForm = {
  allAgreed: boolean;
  serviceTerms: boolean;
  privacyPolicy: boolean;
};

const AgreementPage = () => {
  const navigate = useNavigate();
  const setTermsAgreed = useAuthStore((state) => state.setTermsAgreed);

  const { register, watch, setValue, handleSubmit } = useForm<AgreementForm>({
    mode: 'onChange',
    defaultValues: {
      allAgreed: false,
      serviceTerms: false,
      privacyPolicy: false,
    },
  });

  // 각 항목의 상태를 구독
  const [serviceTerms, privacyPolicy] = watch(['serviceTerms', 'privacyPolicy']);

  // 개별 항목이 변경될 때 '전체 동의' 상태 동기화
  useEffect(() => {
    if (serviceTerms && privacyPolicy) {
      setValue('allAgreed', true);
    } else {
      setValue('allAgreed', false);
    }
  }, [serviceTerms, privacyPolicy, setValue]);

  // '전체 동의' 클릭 핸들러
  const handleAllAgree = (checked: boolean) => {
    setValue('allAgreed', checked);
    setValue('serviceTerms', checked);
    setValue('privacyPolicy', checked);
  };

  const onSubmit = () => {
    setTermsAgreed(true);
    navigate({ to: '/register' });
  };

  return (
    <AuthLayout>
      <AuthHeader
        title="서비스 이용 동의"
        description="Talk It 서비스를 이용하기 위해 약관에 동의해주세요."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 전체 동의 박스 */}
        <div className="rounded-xl border border-primary/20 bg-pale-blue p-5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              {...register('allAgreed', {
                onChange: (e) => handleAllAgree(e.target.checked),
              })}
              className="peer hidden"
            />
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray bg-white text-white transition-all peer-checked:border-primary peer-checked:bg-primary">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-base font-bold text-black">약관 전체 동의하기</span>
          </label>
        </div>

        {/* 개별 약관 리스트 */}
        <div className="space-y-4 px-1">
          {/* 서비스 이용약관 (필수) */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                {...register('serviceTerms', { required: true })}
                className="h-5 w-5 rounded border-gray text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark-gray">
                <span className="font-semibold text-primary">[필수]</span> 서비스 이용약관 동의
              </span>
            </label>
            <TermsModal
              title="서비스 이용약관"
              content={SERVICE_TERMS}
              trigger={
                <button
                  type="button"
                  className="text-xs text-dark-gray underline underline-offset-2 hover:text-black"
                >
                  보기
                </button>
              }
            />
          </div>

          {/* 개인정보 수집 및 이용 (필수) */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                {...register('privacyPolicy', { required: true })}
                className="h-5 w-5 rounded border-gray text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark-gray">
                <span className="font-semibold text-primary">[필수]</span> 개인정보 수집 및 이용
                동의
              </span>
            </label>
            <TermsModal
              title="개인정보 처리방침"
              content={PRIVACY_POLICY}
              trigger={
                <button
                  type="button"
                  className="text-xs text-dark-gray underline underline-offset-2 hover:text-black"
                >
                  보기
                </button>
              }
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <button
          type="submit"
          disabled={!serviceTerms || !privacyPolicy} // 필수 항목 체크 여부로 버튼 활성화
          className={cn(
            'mt-8 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white shadow-sm transition-all',
            serviceTerms && privacyPolicy
              ? 'bg-primary hover:bg-primary/80 active:scale-[0.98]'
              : 'cursor-not-allowed bg-gray text-dark-gray',
          )}
        >
          다음으로
          <ChevronRight size={18} />
        </button>
      </form>
    </AuthLayout>
  );
};

export const Route = createFileRoute('/_public/agreement')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/', replace: true });
    }
  },
  component: AgreementPage,
});
