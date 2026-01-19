import { motion } from 'framer-motion';

type LevelRingProps = {
  level: number;
  percent: number;
  prevPercent: number;
};

const LevelRing = ({ level, percent, prevPercent }: LevelRingProps) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 8;

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
          style={{ strokeDasharray: circumference }}
          initial={{
            strokeDashoffset: circumference - (prevPercent / 100) * circumference,
          }}
          animate={{
            strokeDashoffset: circumference - (percent / 100) * circumference,
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
            delay: 0.5, // 모달창이 뜨고 난 후 0.5초 뒤 시작
          }}
        />
      </svg>

      <div className="absolute flex flex-col items-center text-center">
        <span className="text-[10px] font-bold text-dark-gray">LEVEL</span>
        <span className="text-3xl font-black text-black">{level}</span>
      </div>
    </div>
  );
};

export default LevelRing;
