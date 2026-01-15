import type { SubmitRecordResponseDTO } from '@repo/shared/types/learning';

import axiosInstance from './http';

type SubmitRecordParams = {
  sessionId: number;
  questionId: number;
  audioFile: File;
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
