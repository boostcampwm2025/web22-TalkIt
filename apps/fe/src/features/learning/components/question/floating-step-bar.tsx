import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import * as Tooltip from '@radix-ui/react-tooltip';

import useFloatingStepBarActions from '../../lib/hooks/use-floating-step-bar-actions';
import RewardModal from './reward-modal';
import { Binoculars, SkipForward } from 'lucide-react';

const FloatingStepBar = () => {
  const { endLearning, deepDive, nextQuestion, submitAnswer, isFeedbackPhase, rewardModal } =
    useFloatingStepBarActions();

  return (
    <ActionBar>
      <ActionBar.Button {...endLearning} withDivider>
        학습 종료
      </ActionBar.Button>
      {isFeedbackPhase ? (
        <>
          <ActionBar.Button {...deepDive} className="flex items-center gap-2">
            <Binoculars className="hidden h-4 w-4 sm:block" />
            딥다이브
          </ActionBar.Button>
          <ActionBar.PrimaryButton {...nextQuestion}>다음 질문</ActionBar.PrimaryButton>
        </>
      ) : (
        <>
          <ActionBar.Button {...nextQuestion} className="flex items-center gap-2">
            <SkipForward className="hidden h-4 w-4 sm:block" />
            다음 질문으로 건너뛰기
          </ActionBar.Button>
          <ActionBar.PrimaryButton {...submitAnswer}>답변 제출하기</ActionBar.PrimaryButton>
        </>
      )}
      {rewardModal.data && (
        <RewardModal
          data={rewardModal.data}
          isModalOpen={rewardModal.isOpen}
          onOpenChange={rewardModal.onOpenChange}
        />
      )}
    </ActionBar>
  );
};

export default FloatingStepBar;

type ActionBarButtonProps = React.ComponentProps<'button'> & {
  withDivider?: boolean;
  disabledReason?: string;
};

const ActionBarButton = ({
  children,
  className,
  withDivider,
  disabledReason,
  disabled,
  ...rest
}: ActionBarButtonProps) => {
  const button = (
    <button
      className={cn(
        'px-3 py-2 text-xs disabled:cursor-not-allowed sm:px-6 sm:text-sm',
        withDivider &&
          'relative after:absolute after:top-1/2 after:-right-1 after:h-1/2 after:w-px after:-translate-y-1/2 after:bg-gray-300',
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );

  if (!disabled || !disabledReason) return button;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span tabIndex={0} className="inline-flex">
            {button}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={8}
            className="rounded-lg bg-white px-3 py-2 text-xs text-black shadow-lg"
          >
            {disabledReason}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

const ActionBarPrimaryButton = ({ children, className, ...rest }: ActionBarButtonProps) => {
  return (
    <ActionBarButton
      className={cn(
        'rounded-2xl bg-primary disabled:bg-gray-600 disabled:text-gray-200',
        className,
      )}
      {...rest}
    >
      {children}
    </ActionBarButton>
  );
};

const ActionBarRoot = ({ children }: { children: ReactNode }) => {
  return (
    <div className="sticky bottom-20 -mx-6 flex w-[calc(100%+3rem)] justify-center sm:-mx-10 sm:w-[calc(100%+5rem)]">
      <div className="flex w-fit items-center gap-2 rounded-3xl bg-black p-2 whitespace-nowrap text-white shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
};

const ActionBar = Object.assign(ActionBarRoot, {
  Button: ActionBarButton,
  PrimaryButton: ActionBarPrimaryButton,
});
