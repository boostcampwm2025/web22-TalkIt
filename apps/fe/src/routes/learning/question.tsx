import { useEffect, useRef, useState } from 'react';

import { submitRecordApi } from '@/apis/learning-api';
import { DUMMY_RESULT_DATA } from '@/constants/learning';
import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import PulsingMicButton from '@/features/learning/components/pulsing-mic-button';
import RewardModalContent from '@/features/learning/components/reward-modal';
import { useFinishSession } from '@/features/learning/lib/hooks/use-finish-session';
import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession from '@/lib/stores/learning-session';
import * as Dialog from '@radix-ui/react-dialog';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';

import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const QuestionPage = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const currentQuestionCount = useLearningSession((state) => state.currentQuestionCount);
  const remainedCredit = useLearningSession((state) => state.remainedCredit);
  const resetQuestion = useLearningSession((state) => state.resetQuestion);
  const lastQuestionRef = useRef(question);
  if (question) {
    lastQuestionRef.current = question;
  }
  const activeQuestion = question || lastQuestionRef.current;

  const [answer, setAnswer] = useState<string>('');
  const [isRecordSubmitting, setIsRecordSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<FinishSessionResponseDTO | null>(null);

  const navigate = useNavigate();
  // activeQuestion이 없다면(스토어도 비었고 && 캐시된 것도 없음 == 새로고침/비정상 접근) 메인으로 이동
  useEffect(() => {
    if (!activeQuestion) {
      navigate({ to: '/learning', replace: true });
    }
  }, [activeQuestion, navigate]);
  const handleSubmitRecord = async (audioBlob: Blob) => {
    if (!sessionId || !question) return;

    try {
      setIsRecordSubmitting(true);
      const extension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      const audioFile = new File([audioBlob], `answer.${extension}`, { type: audioBlob.type });
      const { sttText } = await submitRecordApi({
        sessionId,
        questionId: question.questionId,
        audioFile,
      });

      setAnswer(sttText);
    } catch (error) {
      console.error('녹음 제출 실패:', error);
      // TODO: 에러 토스트 표시 또는 재시도 UI
    } finally {
      setIsRecordSubmitting(false);
    }
  };

  const { stream, isRecording, formattedTime, toggleRecording } = useVoiceRecorder({
    timeLimit: question?.timeLimit ?? 300,
    onRecordFinish: handleSubmitRecord,
  });

  // Note: 실제 세션 종료 API 백엔드에서 구현되면 주석 처리된 부분 해제
  // eslint-disable-next-line no-empty-pattern
  const {} = useFinishSession();

  const handleFinishSession = async () => {
    // if (!sessionId) {
    //   console.error('Session ID is missing');
    //   return;
    // }

    // try {
    //   // 1. 실제 API 호출
    //   const resultData = await finishSession(sessionId);

    //   // 2. 응답 데이터로 모달 상태 업데이트
    //   setModalData(resultData);
    //   setIsModalOpen(true);
    // } catch (error) {
    //   // TODO: 에러 처리 (예: 토스트 메시지)
    //   console.error('세션 종료 중 오류 발생:', error);
    // }

    // Note: 실제 세션 종료 API 백엔드에서 구현되면 아래 코드 삭제
    // API 호출 후 데이터 수신 (지금은 더미 사용)
    const resultData = DUMMY_RESULT_DATA;

    // 지역 상태 업데이트 -> 모달 열림
    setModalData(resultData);
    setIsModalOpen(true);

    resetQuestion();
  };

  const handleModalClose = () => {
    setIsModalOpen(false); // 모달 닫기
    navigate({ to: '/learning' }); // 페이지 이동
  };

  if (!activeQuestion) return null;

  return (
    <div className="mx-auto max-w-250 p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <Link
          to="/learning"
          className="flex items-center gap-3 transition-colors hover:text-slate-800"
        >
          <ArrowLeft size={20} />
          <div className="flex flex-col">
            <p className="text-base font-bold">
              {QUESTION_CATEGORY_CONFIG[activeQuestion.category].label}
            </p>
            <span className="text-xs text-dark-gray">
              {QUESTION_DIFFICULTY_CONFIG[activeQuestion.difficulty].label}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-dark-gray">질문 생성권</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
            {remainedCredit}
          </span>
        </div>
      </div>
      <section className="mx-auto mt-8 max-w-150 space-y-4 text-center">
        <span className="inline-block rounded-full border border-primary/20 bg-gray px-3 py-1 text-xs font-bold text-primary sm:text-sm">
          질문 {currentQuestionCount}
        </span>
        <h2 className="text-2xl font-black break-keep sm:text-4xl">{activeQuestion.content}</h2>
        <div className="break-keep text-dark-gray sm:text-lg">
          <div className="flex flex-wrap justify-center [&>span:not(:first-child)]:after:content-[',_']">
            <span>{activeQuestion.guide}</span>

            <p className="pl-2">위 키워드를 중심으로 답변해보세요.</p>
          </div>
        </div>
      </section>
      <section className="mt-6 flex flex-col items-center gap-6">
        <h3 className="sr-only">음성 답변</h3>
        <PulsingMicButton isRecording={isRecording} stream={stream} onToggle={toggleRecording} />
        <p className="text-lg sm:text-2xl">
          <span className="text-dark-gray">남은 시간: </span>
          {formattedTime}
        </p>
      </section>
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-gray bg-white p-8 after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary">
        <h3 className="sr-only">음성 인식 결과</h3>
        <p className="text-xl font-bold">나의 답변</p>
        <div className="mt-4 rounded-md">
          {isRecordSubmitting ? (
            <p className="text-center text-dark-gray">음성 인식 중...</p>
          ) : answer ? (
            <p>{answer}</p>
          ) : (
            <p className="text-center text-dark-gray">
              녹음을 제출하면 인식된 텍스트가 여기에 표시됩니다.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={handleFinishSession}
          className="rounded-lg bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
        >
          학습 종료 (테스트용)
        </button>
      </section>

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AnimatePresence>
          {isModalOpen && modalData && (
            <Dialog.Portal forceMount>
              {/* 배경 (Backdrop) */}
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-sm"
                />
              </Dialog.Overlay>

              {/* 모달 컨텐츠 */}
              <div className="fixed inset-0 z-10000 flex items-center justify-center">
                <Dialog.Content asChild onPointerDownOutside={(e) => e.preventDefault()}>
                  <RewardModalContent
                    data={modalData}
                    onClose={handleModalClose} // 닫기 버튼 누르면 실행될 핸들러 연결
                  />
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
};

export const Route = createFileRoute('/learning/question')({
  component: QuestionPage,
});
