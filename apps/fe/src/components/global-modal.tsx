import { createPortal } from 'react-dom';

import RewardModalContent from '@/features/learning/components/reward-modal';
import useLearningSession from '@/lib/stores/learning-session';
import { useModalStore } from '@/lib/stores/modal-store';
import { useNavigate } from '@tanstack/react-router';

import { AnimatePresence, motion } from 'framer-motion';

// 공통 모달 컴포넌트
const GlobalModal = () => {
  const { isOpen, type, props, close } = useModalStore();
  const navigate = useNavigate();
  const resetQuestion = useLearningSession((state) => state.resetQuestion);

  // 모달 밖 배경을 클릭했을 때 핸들링 함수
  const handleBackdropClick = () => {
    if (type === 'REWARD') return;
    close();
  };

  // 리워드 모달창을 닫는 함수
  const handleRewardClose = () => {
    close();
    resetQuestion(); // 학습 세션 상태 비우기
    navigate({ to: '/learning' });
  };

  // 모달의 타입에 맞게 적절한 모달 컨텐츠를 렌더링하는 함수
  const renderModalContent = () => {
    switch (type) {
      case 'REWARD':
        return <RewardModalContent data={props} onClose={handleRewardClose} />;
      // Note: 추후 다른 모달 컴포넌트 생성 시 case 추가

      default:
        return null;
    }
  };
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <div className="relative z-10">{renderModalContent()}</div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default GlobalModal;
