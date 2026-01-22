import { type ReactNode, useState } from 'react';

import { getDeepDiveQuestionApi, getNextQuestionApi, submitAssessApi } from '@/apis/learning-api';
import { DUMMY_RESULT_DATA } from '@/constants/learning';
import useLearningSession from '@/lib/stores/learning-session';
import { cn } from '@/lib/utils';
import type { FinishSessionResponseDTO } from '@repo/shared/types/learning';

import { ANSWER_PHASE, useAnswerFlow } from '../lib/contexts/answer-flow-context';
import RewardModal from './reward-modal';
import { Binoculars, SkipForward } from 'lucide-react';

const FloatingStepBar = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);

  const { phase, setPhase, sttText, setAnswerId, answerId, recordingTime, reset } = useAnswerFlow();

  const [rewardData, setRewardData] = useState<FinishSessionResponseDTO | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  const isFeedbackPhase =
    phase === ANSWER_PHASE.FEEDBACK_LOADING || phase === ANSWER_PHASE.FEEDBACK_DONE;

  const handleEndLearning = async () => {
    if (!sessionId) return;

    const data = DUMMY_RESULT_DATA; // await finishSessionApi({ sessionId });
    setRewardData(data);
    useLearningSession.getState().resetQuestion();
    setIsRewardModalOpen(true);
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !question || !sttText) return;

    try {
      setPhase(ANSWER_PHASE.FEEDBACK_LOADING);
      const { answerId: newAnswerId } = await submitAssessApi({
        sessionId,
        questionId: question.questionId,
        extraQuestionId: question.extraQuestionId,
        answerText: sttText,
        timeSpentSec: recordingTime,
      });

      setAnswerId(newAnswerId);
    } catch (error) {
      console.error('평가 제출 실패:', error);
    }
  };

  const handleNextQuestion = () => {
    if (!sessionId) return;

    reset();
    getNextQuestionApi(sessionId).then((data) => {
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    });
  };

  const handleDeepDive = () => {
    if (!sessionId || !answerId) return;

    getDeepDiveQuestionApi(sessionId, answerId).then((data) => {
      reset();
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    });
  };

  return (
    <ActionBar>
      <ActionBar.Button onClick={handleEndLearning} withDivider>
        학습 종료
      </ActionBar.Button>
      {isFeedbackPhase ? (
        <>
          <ActionBar.Button onClick={handleDeepDive} className="flex items-center gap-2">
            <Binoculars className="hidden h-4 w-4 sm:block" />
            딥다이브
          </ActionBar.Button>
          <ActionBar.PrimaryButton onClick={handleNextQuestion}>다음 질문</ActionBar.PrimaryButton>
        </>
      ) : (
        <>
          <ActionBar.Button onClick={handleNextQuestion} className="flex items-center gap-2">
            <SkipForward className="hidden h-4 w-4 sm:block" />
            다음 질문으로 건너뛰기
          </ActionBar.Button>
          <ActionBar.PrimaryButton onClick={handleSubmitAnswer}>
            답변 제출하기
          </ActionBar.PrimaryButton>
        </>
      )}
      {rewardData && (
        <RewardModal
          data={rewardData}
          isModalOpen={isRewardModalOpen}
          onOpenChange={setIsRewardModalOpen}
        />
      )}
    </ActionBar>
  );
};

export default FloatingStepBar;

type ActionBarButtonProps = React.ComponentProps<'button'> & { withDivider?: boolean };

const ActionBarButton = ({ children, className, withDivider, ...rest }: ActionBarButtonProps) => {
  return (
    <button
      className={cn(
        'px-3 py-2 text-xs sm:px-6 sm:text-sm',
        withDivider &&
          'relative after:absolute after:top-1/2 after:-right-1 after:h-1/2 after:w-px after:-translate-y-1/2 after:bg-gray-300',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

const ActionBarPrimaryButton = ({ children, className, ...rest }: ActionBarButtonProps) => {
  return (
    <ActionBarButton className={cn('rounded-2xl bg-primary', className)} {...rest}>
      {children}
    </ActionBarButton>
  );
};

const ActionBarRoot = ({ children }: { children: ReactNode }) => {
  return (
    <div className="sticky bottom-20 -mx-6 flex w-[calc(100%+3rem)] justify-center sm:-mx-10 sm:w-[calc(100%+5rem)]">
      <div className="flex w-fit items-center gap-2 rounded-3xl bg-black p-2 whitespace-nowrap text-white shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
};

const ActionBar = Object.assign(ActionBarRoot, {
  Button: ActionBarButton,
  PrimaryButton: ActionBarPrimaryButton,
});
