import type { ModalKey, ModalMap } from '@/types/modal';

import { create } from 'zustand';

// 열려 있는 상태 타입 (Discriminant Union을 통해 props가 자동으로 타입을 인식)
type ModalOpenState = {
  [K in ModalKey]: {
    type: K;
    props: ModalMap[K];
    isOpen: true;
  };
}[ModalKey];

// 닫혀있는 상태 타입
type ModalClosedState = {
  type: null;
  props: null;
  isOpen: false;
};

type ModalState = (ModalOpenState | ModalClosedState) & {
  open: <T extends ModalKey>(type: T, props: ModalMap[T]) => void;
  close: () => void;
};

// 모달 관리 전역 상태 (타입, 내부 컨텐츠, 모달 open 여부)
export const useModalStore = create<ModalState>((set) => ({
  type: null,
  props: null,
  isOpen: false,

  open: (type, props) =>
    set({
      type,
      props,
      isOpen: true,
    } as ModalOpenState),
  close: () => set({ type: null, props: null, isOpen: false }),
}));
