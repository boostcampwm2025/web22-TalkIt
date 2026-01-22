import type { QuestionCategory, QuestionDifficulty } from '@repo/shared/constants/learning';
import type {
  AssessRequestDTO,
  AssessResponseDTO,
  CreateQuestionResponseDTO,
  FinishSessionResponseDTO,
  GetFeedbackResponseDTO,
  GetNextQuestionResponseDTO,
  SubmitRecordResponseDTO,
} from '@repo/shared/types/learning';

import axiosInstance from './http';

type SubmitRecordParams = {
  sessionId: number;
  questionId: number;
  audioFile: File;
};

type FinishSessionParams = {
  sessionId: number;
};

type SubmitAssessParams = {
  sessionId: number;
} & AssessRequestDTO;

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

/**
 * 답변 제출 및 평가 시작
 * 답변 텍스트와 소요 시간을 전송하고 평가 작업을 시작합니다.
 */
export const submitAssessApi = async ({
  sessionId,
  questionId,
  answerText,
  timeSpentSec,
}: SubmitAssessParams): Promise<AssessResponseDTO> => {
  const { data } = await axiosInstance.post<AssessResponseDTO>(
    `/learning/sessions/${sessionId}/assess`,
    {
      questionId,
      answerText,
      timeSpentSec,
    },
  );
  return data;
};

/**
 * 평가 스냅샷 조회 (재연결 복구용)
 */
export const getFeedbackApi = async (answerId: number): Promise<GetFeedbackResponseDTO> => {
  const { data } = await axiosInstance.get<GetFeedbackResponseDTO>(
    `/learning/answers/${answerId}/assess`,
  );
  return data;
};

/**
 * 다음 질문 조회 (세션 내 다음 질문으로 이동)
 */
export const getNextQuestionApi = async (sessionId: number) => {
  const { data } = await axiosInstance.post<GetNextQuestionResponseDTO>(
    `/learning/sessions/${sessionId}/next-question`,
  );
  return data;
};
