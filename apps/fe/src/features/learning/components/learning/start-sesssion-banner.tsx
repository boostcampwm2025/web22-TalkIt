import * as Tooltip from '@radix-ui/react-tooltip';

import { Mic } from 'lucide-react';

type StartSessionBannerProps = {
  isVisible: boolean;
  selectedTopicLabel?: string;
  selectedDifficultyLabel?: string;
  isLoading: boolean;
  isStartDisabled: boolean;
  isCreditInsufficient: boolean;
  onStart: () => void;
};

const StartSessionBanner = ({
  isVisible,
  selectedTopicLabel,
  selectedDifficultyLabel,
  isLoading,
  isStartDisabled,
  isCreditInsufficient,
  onStart,
}: StartSessionBannerProps) => {
  return (
    <section
      className={`relative flex transform flex-col items-center justify-between overflow-hidden rounded-2xl bg-black p-6 text-white transition-all duration-700 ease-in-out md:flex-row md:p-8 ${
        isVisible
          ? 'visible translate-y-0 opacity-100'
          : 'pointer-events-none invisible translate-y-10 opacity-0'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-r from-primary/20 to-transparent"></div>

      <div className="z-10 mb-6 w-full md:mb-0 md:w-auto">
        <span className="mb-2 inline-block rounded-3xl border border-primary/30 bg-primary/30 px-2 py-1 text-xs text-primary">
          AI Learning
        </span>
        <p className="mb-1 text-lg font-bold md:text-xl">오늘의 AI 튜터가 준비되었습니다.</p>
        <p className="text-sm text-gray">
          선택하신 <span className="mx-1 font-bold text-primary">{selectedTopicLabel}</span> 주제 /
          <span className="mx-1 font-bold text-primary">{selectedDifficultyLabel}</span> 난이도
        </p>
      </div>

      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root open={isCreditInsufficient ? undefined : false}>
          <Tooltip.Trigger asChild>
            <span className="z-10 w-full md:w-auto" tabIndex={isStartDisabled ? 0 : undefined}>
              <button
                onClick={onStart}
                disabled={isStartDisabled}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-medium text-white transition-colors md:w-auto md:py-3 ${
                  isStartDisabled
                    ? 'cursor-not-allowed bg-dark-gray'
                    : 'bg-primary hover:bg-primary/80'
                }`}
              >
                {isLoading ? (
                  <span>질문 생성 중...</span>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span className="text-lg md:text-base">학습 시작하기</span>
                  </>
                )}
              </button>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="top"
              sideOffset={8}
              className="z-50 rounded-lg bg-white px-3 py-2 text-xs text-black shadow-lg"
            >
              크레딧이 부족하여 학습을 시작할 수 없어요
              <Tooltip.Arrow className="fill-white" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </section>
  );
};

export default StartSessionBanner;
