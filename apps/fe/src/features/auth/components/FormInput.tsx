import { type ComponentProps, type ReactNode, useId, useState } from 'react';
import type { FieldError } from 'react-hook-form';

import { cn } from '@/lib/utils';

import { Eye, EyeOff } from 'lucide-react';

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
  type,
  ...props
}: FormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const generatedId = useId();
  const id = generatedId;

  // type이 password인 경우에만 토글 기능을 활성화
  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-dark-gray">
        {label}
      </label>
      <div className="relative flex gap-2">
        <input
          id={id}
          ref={ref}
          type={inputType}
          className={cn(
            'w-full rounded-lg border border-gray bg-white px-3 py-3 text-base transition-all outline-none placeholder:text-dark-gray focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray md:text-sm',
            isPasswordType && 'pr-10',
            error && 'border-alert focus:border-alert focus:ring-alert/10',
            className,
          )}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-dark-gray hover:text-black focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && <p className="text-xs text-alert">{error.message}</p>}

      {/* 에러가 없을 때 보여줄 하단 메시지 (예: 사용 가능한 이메일입니다) */}
      {!error && bottomMessage}
    </div>
  );
};

FormInput.displayName = 'FormInput';
