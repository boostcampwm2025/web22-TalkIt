import { useEffect, useState } from 'react';

import * as Tooltip from '@radix-ui/react-tooltip';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';

type LevelRingProps = {
  level: number;
  startPercent: number;
  endPercent: number;
  isLevelUp: boolean;
  currentXp: number;
  requiredXp: number;
};

const LevelRing = ({
  level,
  startPercent,
  endPercent,
  isLevelUp,
  currentXp,
  requiredXp,
}: LevelRingProps) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 8;

  const progress = useMotionValue(startPercent);
  const strokeDashoffset = useTransform(progress, [0, 100], [circumference, 0]);

  // 화면에 표시될 레벨
  const [displayLevel, setDisplayLevel] = useState(isLevelUp ? level - 1 : level);
  const [showLevelUpText, setShowLevelUpText] = useState(false);

  useEffect(() => {
    const playAnimation = async () => {
      progress.set(startPercent);

      // 모달 애니메이션 대기 (0.5s)
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (isLevelUp) {
        // [CASE 1: 레벨업 발생]
        // 현재 바를 100%까지 채움
        await animate(progress, 100, { duration: 1, ease: 'easeOut' });

        // Level Up 텍스트 표시 & 레벨 숫자 변경
        setShowLevelUpText(true);
        setDisplayLevel(level);

        // 레벨업 연출 감상 대기
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 경험치 바를 0%로 즉시 리셋
        progress.set(0);
        setShowLevelUpText(false);

        // 0%에서 최종 목표(잔여 경험치)까지 채움
        await animate(progress, endPercent, { duration: 1, ease: 'easeOut' });
      } else {
        // [CASE 2: 일반 경험치 획득]
        // 시작점에서 목표점까지 한 번에 이동
        await animate(progress, endPercent, { duration: 1.5, ease: 'easeOut' });
      }
    };

    playAnimation();
  }, [startPercent, endPercent, isLevelUp, level, progress]);
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="group relative flex h-32 w-32 items-center justify-center rounded-full">
            {/* SVG 캔버스: -90도 회전하여 12시 방향부터 시작 */}
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* 레벨 링 progress bar의 배경 트랙 */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-medium-gray"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* 진행 바 */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-primary group-hover:brightness-75"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                }}
              />
            </svg>

            <div className="absolute flex flex-col items-center text-center">
              {showLevelUpText ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-sm font-black text-light-green drop-shadow-md">
                    LEVEL
                    <br />
                    UP!
                  </span>
                </motion.div>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-dark-gray">LEVEL</span>
                  <span className="text-3xl font-black text-black">{displayLevel}</span>
                </>
              )}
            </div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-10000 rounded-xl bg-black/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm select-none"
            side="bottom"
            sideOffset={15}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-medium text-gray-300">XP Progress</span>
              <span className="font-mono text-sm">
                {currentXp} <span className="text-dark-gray-500">/</span> {requiredXp}
              </span>
            </div>
            <Tooltip.Arrow className="fill-black/90" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default LevelRing;
