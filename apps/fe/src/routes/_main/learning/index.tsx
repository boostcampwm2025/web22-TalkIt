import { useState } from 'react';

import {
  finishSessionApi,
  getInProgressSessionApi,
  resumeSessionApi,
  startSessionApi,
} from '@/apis/learning-api';
import { getUserInfoApi } from '@/apis/user-api';
import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import DifficultySelector from '@/features/learning/components/learning/difficulty-selector';
import LearningHeader from '@/features/learning/components/learning/learning-header';
import LearningStatsSection from '@/features/learning/components/learning/learning-stats-section';
import ResumeSessionModal from '@/features/learning/components/learning/resume-session-modal';
import StartSessionBanner from '@/features/learning/components/learning/start-sesssion-banner';
import TopicSelector from '@/features/learning/components/learning/topic-selector';
import { useProgressAnimation } from '@/features/learning/lib/hooks/use-progress-animation';
import useLearningSession from '@/lib/stores/learning-session';
import { useUserStore } from '@/lib/stores/user-store';
import { type QuestionCategory, type QuestionDifficulty } from '@repo/shared/constants/learning';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const LearningPage = () => {
  const navigate = useNavigate();

  const userInfo = useUserStore((state) => state.userInfo)!;
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const setQuestion = useLearningSession((state) => state.setQuestion);
  const resetAnswerFlow = useLearningSession((state) => state.resetAnswerFlow);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<QuestionCategory | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | null>(null);

  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [detectedSessionId, setDetectedSessionId] = useState<number | null>(null);

  const { profile, progression, studyStats, remainingCredit } = userInfo;
  const { progress, calculatedPercent } = useProgressAnimation(
    progression?.currentXp ?? 0,
    progression?.requiredXpForNextLevel ?? 100,
    100,
  );

  const topicOptions = Object.values(QUESTION_CATEGORY_CONFIG);
  const difficultyOptions = Object.values(QUESTION_DIFFICULTY_CONFIG);

  const isCreditInsufficient = remainingCredit <= 0;
  const isStartDisabled = isLoading || isCreditInsufficient;

  // 새로운 세션 생성 요청
  const createNewSession = async () => {
    if (!selectedTopic || !selectedDifficulty || isCreditInsufficient) return;

    setIsLoading(true);
    try {
      const data = await startSessionApi(selectedTopic, selectedDifficulty);
      setQuestion(data);

      await navigate({ to: '/learning/question' });
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 학습 시작하기 버튼 클릭 시 진행중인 세션이 있는지 확인
  const handleStartCheck = async () => {
    if (!selectedTopic || !selectedDifficulty || isCreditInsufficient) return;

    setIsLoading(true);

    resetAnswerFlow();

    try {
      const data = await getInProgressSessionApi();

      if (data.hasSession && data.sessionId) {
        // 진행 중인 세션 있음
        setDetectedSessionId(data.sessionId);
        setResumeModalOpen(true);

        setIsLoading(false);
      } else {
        // 진행 중인 세션 없음
        await createNewSession();
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
      setIsLoading(false);
    }
  };

  // 세션 이어하기
  const handleResumeSession = async () => {
    if (!detectedSessionId) return;

    setIsLoading(true);
    try {
      const sessionData = await resumeSessionApi(detectedSessionId);

      setQuestion(sessionData);

      setResumeModalOpen(false);
      await navigate({ to: '/learning/question' });
    } catch (error) {
      // todo: 추후에 alert, console.error 코드 제거 후 리팩토링
      console.error('Failed to resume session:', error);
      alert('세션을 불러올 수 없습니다. 다시 시도해주세요.');
      setResumeModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 이어하지 않고 종료하기
  const handleAbortSession = async () => {
    if (!detectedSessionId) return;

    setIsLoading(true);
    try {
      await finishSessionApi({ sessionId: detectedSessionId });

      const updatedUserInfo = await getUserInfoApi();
      setUserInfo(updatedUserInfo);

      setResumeModalOpen(false);
      setDetectedSessionId(null);
    } catch (error) {
      // todo: 추후에 alert, console.error 코드 제거 후 리팩토링
      console.error('Failed to abort session:', error);
      alert('세션 종료 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-pale-blue p-8">
      <div className="w-full max-w-5xl space-y-6 md:space-y-8">
        {/* 상단 헤더 */}
        <LearningHeader
          nickname={profile.nickname}
          studyStats={studyStats}
          progression={progression}
          remainingCredit={remainingCredit}
          progress={progress}
          calculatedPercent={calculatedPercent}
        />

        {/* 사용자 스탯 */}
        <LearningStatsSection
          progression={progression}
          studyStats={studyStats}
          progress={progress}
          calculatedPercent={calculatedPercent}
        />

        {/* 주제 선택 */}
        <TopicSelector
          options={topicOptions}
          selectedTopic={selectedTopic}
          onSelect={setSelectedTopic}
        />

        {/* 난이도 설정 */}
        <DifficultySelector
          isVisible={selectedTopic !== null}
          options={difficultyOptions}
          selectedDifficulty={selectedDifficulty}
          onSelect={setSelectedDifficulty}
        />

        {/* 학습 시작 버튼 섹션 */}
        <StartSessionBanner
          isVisible={selectedTopic !== null && selectedDifficulty !== null}
          selectedTopicLabel={topicOptions.find((t) => t.id === selectedTopic)?.label}
          selectedDifficultyLabel={
            difficultyOptions.find((d) => d.value === selectedDifficulty)?.label
          }
          isLoading={isLoading}
          isStartDisabled={isStartDisabled}
          isCreditInsufficient={isCreditInsufficient}
          onStart={handleStartCheck}
        />

        <ResumeSessionModal
          isOpen={resumeModalOpen}
          onOpenChange={(open) => {
            if (!isLoading) setResumeModalOpen(open);
          }}
          onResume={handleResumeSession}
          onAbort={handleAbortSession}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_main/learning/')({
  component: LearningPage,
});
