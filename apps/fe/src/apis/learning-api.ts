import type { QuestionCategory, QuestionDifficulty } from '@repo/shared/constants/learning';
import type {
  CreateQuestionResponseDTO,
  FinishSessionResponseDTO,
} from '@repo/shared/types/learning';
import type { SubmitRecordResponseDTO } from '@repo/shared/types/learning';

import axiosInstance from './http';

type SubmitRecordParams = {
  sessionId: number;
  questionId: number;
  audioFile: File;
};

type FinishSessionParams = {
  sessionId: number;
};

// 세션 생성 API
export const startSessionApi = async (
  category: QuestionCategory,
  difficulty: QuestionDifficulty,
) => {
  const { data } = await axiosInstance.post<CreateQuestionResponseDTO>('/learning/sessions', {
    category,
    difficulty,
  });
  return data;
};

/**
 * 세션 답변 녹음 제출
 * 음성 파일(audioFile)과 답변 메타데이터를 업로드합니다.
 */
export const submitRecordApi = async ({
  sessionId,
  questionId,
  audioFile,
}: SubmitRecordParams): Promise<SubmitRecordResponseDTO> => {
  const formData = new FormData();
  formData.append('questionId', String(questionId));
  formData.append('audioFile', audioFile);

  const response = await axiosInstance.post(`/learning/sessions/${sessionId}/record`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * 학습 세션 종료
 */
export const finishSessionApi = async ({
  sessionId,
}: FinishSessionParams): Promise<FinishSessionResponseDTO> => {
  const { data } = await axiosInstance.post<FinishSessionResponseDTO>(
    `/learning/sessions/${sessionId}/finish`,
  );
  return data;
};
