import type { ReactNode } from 'react';

import { getNextQuestionApi, submitAssessApi } from '@/apis/learning-api';
import useLearningSession from '@/lib/stores/learning-session';
import { cn } from '@/lib/utils';

import { ANSWER_PHASE, useAnswerFlow } from '../lib/contexts/answer-flow-context';
import { Binoculars, SkipForward } from 'lucide-react';

const FloatingStepBar = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);

  const { phase, setPhase, sttText, setAnswerId, recordingTime } = useAnswerFlow();

  const isFeedbackPhase =
    phase === ANSWER_PHASE.FEEDBACK_LOADING || phase === ANSWER_PHASE.FEEDBACK_DONE;

  const handleEndLearning = () => {};

  const handleSubmitAnswer = async () => {
    if (!sessionId || !question || !sttText) return;

    try {
      setPhase(ANSWER_PHASE.FEEDBACK_LOADING);
      const { answerId: newAnswerId } = await submitAssessApi({
        sessionId,
        questionId: question.questionId,
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

    setPhase(ANSWER_PHASE.IDLE);
    getNextQuestionApi(sessionId).then((data) => {
      useLearningSession.getState().setQuestion({ ...data, sessionId });
    });
  };

  const handleDeepDive = () => {};

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
