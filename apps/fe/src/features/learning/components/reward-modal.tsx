import { forwardRef } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

import LevelRing from './level-ring';
import { motion } from 'motion/react';

type RewardModalContentProps = {
  data: FinishSessionResponseDTO;
  onClose: () => void;
};

const RewardModalContent = forwardRef<HTMLDivElement, RewardModalContentProps>(
  ({ data, onClose, ...props }, ref) => {
    const { currentXp, requiredXp, level, gainedXp, question } = data;

    // 경험치 관련 계산 (남은 경험치, 프로그레스 바 애니메이션 위한 계산)
    const remainXp = requiredXp - currentXp;
    const prevXp = currentXp - gainedXp;
    const prevPercent = Math.max(0, (prevXp / requiredXp) * 100);
    const targetPercent = Math.min(100, (currentXp / requiredXp) * 100);

    return (
      <motion.article
        ref={ref}
        {...props}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="flex h-150 w-225 overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="reward-title"
      >
        {/* 왼쪽 섹션 */}
        <section className="flex flex-[1.2] flex-col justify-between p-10">
          <header>
            <Dialog.Title className="mt-3 text-3xl font-extrabold text-black">
              학습 성과 리포트
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-dark-gray">
              오늘의 꾸준함이 모여 당신의 지식이 됩니다.
            </Dialog.Description>
          </header>

          <section
            aria-label="레벨 및 경험치 현황"
            className="flex items-center gap-8 rounded-2xl bg-gray p-6"
          >
            <div className="shrink-0">
              <LevelRing level={level} percent={targetPercent} prevPercent={prevPercent} />
            </div>
            <div>
              <p className="text-4xl font-black text-primary">+{gainedXp} XP</p>
              <p className="mt-1 text-xs font-medium text-dark-gray">
                다음 레벨까지 <span className="text-black">{remainXp} XP</span> 남았습니다
              </p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            {/* XP 획득 내역 */}
            {/* Note: 획득 내역에 대한 API 명세는 없으므로 우선 하드코딩 해두었음 */}
            {/* Todo: 추후 수정이 필요함 */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-dark-gray">XP 획득 내역</h3>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex justify-between border-b border-gray pb-2">
                  <span className="text-dark-gray">✅ 정답 보상</span>
                  <span className="font-bold text-black">+150</span>
                </li>
                <li className="flex justify-between border-b border-gray pb-2">
                  <span className="text-dark-gray">🔥 스트릭 보너스</span>
                  <span className="font-bold text-black">+80</span>
                </li>
                <li className="flex justify-between border-b border-gray pb-2">
                  <span className="text-dark-gray">💬 답변 완료</span>
                  <span className="font-bold text-black">+50</span>
                </li>
              </ul>
            </section>

            {/* 최근 학습 성과 */}
            {/* Note: 학습 성과에 대한 API 명세는 없으므로 우선 하드코딩 해두었음 */}
            {/* Todo: 추후 수정이 필요함 */}
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-dark-gray">최근 학습 성과</h3>
              <div className="flex flex-col gap-2">
                <dl className="flex flex-col rounded-xl bg-gray p-3">
                  <dt className="text-[10px] font-semibold text-dark-gray">학습 정확도</dt>
                  <dd className="flex items-end gap-1">
                    <span className="text-lg font-bold text-black">92%</span>
                    <span className="mb-1 text-[10px] font-bold text-light-green">▲ 4%</span>
                  </dd>
                </dl>
                <dl className="flex flex-col rounded-xl bg-gray p-3">
                  <dt className="text-[10px] font-semibold text-dark-gray">평균 답변 시간</dt>
                  <dd className="flex items-end gap-1">
                    <span className="text-lg font-bold text-black">45s</span>
                    <span className="mb-1 text-[10px] font-bold text-primary">-2s</span>
                  </dd>
                </dl>
              </div>
            </section>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/80 active:scale-[0.98]"
          >
            메인으로 돌아가기
          </button>
        </section>

        {/* 오른쪽 섹션: 시각 자료 (figure 사용) */}
        <figure className="relative flex flex-[0.8] flex-col bg-linear-to-br from-gray to-pale-blue">
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
