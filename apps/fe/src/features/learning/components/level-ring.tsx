import { useEffect, useState } from 'react';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';

type LevelRingProps = {
  level: number;
  startPercent: number;
  endPercent: number;
  isLevelUp: boolean;
};

const LevelRing = ({ level, startPercent, endPercent, isLevelUp }: LevelRingProps) => {
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
    <div className="relative flex h-32 w-32 items-center justify-center">
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
          className="stroke-primary"
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
  );
};

export default LevelRing;
