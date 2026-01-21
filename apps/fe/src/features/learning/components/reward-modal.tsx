import { forwardRef, useMemo } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

import FallingBooksScene from './falling-book-scene';
import LevelRing from './level-ring';
import { motion } from 'motion/react';

type RewardModalContentProps = {
  data: FinishSessionResponseDTO;
  onClose: () => void;
};

const RewardModalContent = forwardRef<HTMLDivElement, RewardModalContentProps>(
  ({ data, onClose, ...props }, ref) => {
    const { currentXp, requiredXp, level, gainedXp, difficulty, questions } = data;

    // 세부 XP 합산
    const totalGainedXp = useMemo(() => {
      return gainedXp.baseXp + (gainedXp.difficultyBonus || 0) + (gainedXp.deepDiveBonus || 0);
    }, [gainedXp]);

    // 리포트의 세션 평균 점수를 위한 계산
    const averageScore = useMemo(() => {
      if (!questions || questions.length === 0) return 0;
      const sum = questions.reduce((acc, q) => acc + (q.score || 0), 0);
      return Math.round(sum / questions.length);
    }, [questions]);

    // 경험치 바에 사용될 XP 값들
    const remainXp = requiredXp - currentXp;
    const prevXp = currentXp - totalGainedXp;

    const prevPercent = Math.max(0, (prevXp / requiredXp) * 100);
    const targetPercent = Math.min(100, (currentXp / requiredXp) * 100);

    // XP 히스토리 렌더링을 위한 객체
    // todo: 추후 constants로 분리 같은 수정 필요
    const xpHistoryItems = useMemo(() => {
      const items = [
        {
          id: 'basic',
          label: '기본 XP',
          amount: gainedXp.baseXp,
          icon: '✅',
          textColor: 'text-black',
        },
      ];

      // 난이도 보너스
      if (gainedXp.difficultyBonus && gainedXp.difficultyBonus > 0) {
        items.push({
          id: 'difficulty',
          label: `[${difficulty}] 난이도 보너스`,
          amount: gainedXp.difficultyBonus,
          icon: '🔥',
          textColor: 'text-black',
        });
      }

      // 딥다이브(꼬리질문) 보너스
      if (gainedXp.deepDiveBonus && gainedXp.deepDiveBonus > 0) {
        items.push({
          id: 'deepdive',
          label: '딥다이브 학습',
          amount: gainedXp.deepDiveBonus,
          icon: '🌊',
          textColor: 'text-black',
        });
      }

      return items;
    }, [gainedXp, difficulty]);

    return (
      <motion.article
        ref={ref}
        {...props}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="flex w-250 overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="reward-title"
      >
        {/* 왼쪽 섹션 */}
        <section className="flex flex-[1.2] flex-col justify-between p-10">
          <header>
            <Dialog.Title className="text-3xl font-extrabold text-black">
              학습 성과 리포트
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-dark-gray">
              오늘의 꾸준함이 모여 당신의 지식이 됩니다.
            </Dialog.Description>
          </header>

          <section
            aria-label="레벨 및 경험치 현황"
            className="mt-3 flex items-center gap-8 rounded-2xl bg-gray p-6"
          >
            <div className="shrink-0">
              <LevelRing level={level} percent={targetPercent} prevPercent={prevPercent} />
            </div>
            <div>
              <p className="text-4xl font-black text-primary">+{totalGainedXp} XP</p>
              <p className="mt-1 text-xs font-medium text-dark-gray">
                다음 레벨까지 <span className="text-black">{remainXp} XP</span> 남았습니다
              </p>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-4">
            {/* XP 획득 내역 */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-dark-gray">XP 획득 내역</h3>
              <ul className="flex flex-col gap-3">
                {xpHistoryItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-gray/50 bg-white px-4 py-3 text-sm shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className={`font-bold ${item.textColor}`}>{item.label}</span>
                    </div>
                    <span className="font-extrabold text-black">+{item.amount}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 최근 학습 성과 */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-dark-gray">학습 결과</h3>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col justify-center rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10">
                  <span className="text-sm font-bold text-primary">평균 점수</span>
                  <span className="mt-1 text-xl font-black text-primary">{averageScore}점</span>
                </div>

                <div className="flex flex-col justify-center rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10">
                  <span className="text-sm font-bold text-primary">총 해결 문제</span>
                  <span className="mt-1 text-xl font-black text-primary">
                    {questions ? questions.length : 0}문제
                  </span>
                </div>
              </div>
            </section>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full cursor-pointer rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/80 active:scale-[0.98]"
          >
            메인으로 돌아가기
          </button>
        </section>

        {/* 오른쪽 섹션: 시각 자료 (figure 사용) */}
        <figure className="relative flex flex-[0.8] flex-col bg-linear-to-br from-gray to-pale-blue">
          <div className="absolute inset-0 h-full w-full">
            <FallingBooksScene questions={questions || []} />
          </div>
          {/* 3D 책 쌓기 캔버스 부분에 대한 캡션 */}
          <figcaption className="pointer-events-none absolute bottom-10 z-10 w-full text-center">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.2em] text-dark-gray">
              KNOWLEDGE GROWTH
            </p>
            <p className="text-xs leading-relaxed text-dark-gray">
              매 학습 세션이 지식의 기둥이 되어
              <br />
              당신의 커리어를 지탱합니다.
            </p>
          </figcaption>
        </figure>
      </motion.article>
    );
  },
);

RewardModalContent.displayName = 'RewardModalContent';

export default RewardModalContent;
