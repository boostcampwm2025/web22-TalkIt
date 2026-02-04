import { useState } from 'react';

import { startSessionApi } from '@/apis/learning-api';
import { QUESTION_CATEGORY_CONFIG, QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import DifficultySelector from '@/features/learning/components/learning/difficulty-selector';
import LearningHeader from '@/features/learning/components/learning/learning-header';
import LearningStatsSection from '@/features/learning/components/learning/learning-stats-section';
import StartSessionBanner from '@/features/learning/components/learning/start-sesssion-banner';
import TopicSelector from '@/features/learning/components/learning/topic-selector';
import { useProgressAnimation } from '@/features/learning/lib/hooks/use-progress-animation';
import useLearningSession from '@/lib/stores/learning-session';
import { useUserStore } from '@/lib/stores/user-store';
import { type QuestionCategory, type QuestionDifficulty } from '@repo/shared/constants/learning';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const LearningPage = () => {
  const userInfo = useUserStore((state) => state.userInfo)!;
  const setQuestion = useLearningSession((state) => state.setQuestion);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<QuestionCategory | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | null>(null);

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

  const handleStartClick = async () => {
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
          onStart={handleStartClick}
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_main/learning/')({
  component: LearningPage,
});
