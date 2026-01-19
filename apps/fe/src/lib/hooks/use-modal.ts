import { useModalStore } from '@/lib/stores/modal-store';
import { type ModalKey, type ModalMap } from '@/types/modal';

// 모달 컴포넌트를 관리하는 커스텀 훅
export const useModal = () => {
  const { open: storeOpen, close } = useModalStore();

  const open = <T extends ModalKey>(type: T, props: ModalMap[T]) => {
    storeOpen(type, props);
  };

  return { open, close };
};
