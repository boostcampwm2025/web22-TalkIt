import { type ComponentProps, type ReactNode, forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

import { cn } from '@/lib/utils';

type FormInputProps = ComponentProps<'input'> & {
  label: string;
  error?: FieldError;
  bottomMessage?: ReactNode;
};

export const FormInput = ({
  label,
  error,
  className,
  bottomMessage,
  ref,
  ...props
}: FormInputProps) => {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-dark-gray">{label}</label>
      <div className="flex gap-2">
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-gray bg-white px-3 py-3 text-base transition-all outline-none placeholder:text-dark-gray focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray md:text-sm',
            error && 'border-alert focus:border-alert focus:ring-alert/10',
            className,
          )}
          {...props}
        />
      </div>

      {/* 에러 메시지 */}
      {error && <p className="text-xs text-alert">{error.message}</p>}

      {/* 에러가 없을 때 보여줄 하단 메시지 (예: 사용 가능한 이메일입니다) */}
      {!error && bottomMessage}
    </div>
  );
};

FormInput.displayName = 'FormInput';
