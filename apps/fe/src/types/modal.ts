import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

export type ModalMap = {
  REWARD: FinishSessionResponseDTO;

  // Note: 추후 다른 모달 컨텐츠가 필요하다면 여기에 타입 정의
};

export type ModalKey = keyof ModalMap;
