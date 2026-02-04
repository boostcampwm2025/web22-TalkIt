import { submitRecordApi } from '@/apis/learning-api';
import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession, { ANSWER_PHASE } from '@/lib/stores/learning-session';

import PulsingMicButton from './pulsing-mic-button';

const VoiceRecorderSection = () => {
  const sessionId = useLearningSession((state) => state.sessionId);
  const question = useLearningSession((state) => state.question);
  const phase = useLearningSession((state) => state.phase);
  const setPhase = useLearningSession((state) => state.setPhase);
  const setRecordingTime = useLearningSession((state) => state.setRecordingTime);
  const setSttText = useLearningSession((state) => state.setSttText);

  const timeLimit = question?.timeLimit ?? 300;

  const handleRecordFinish = async (audioBlob: Blob, elapsedTime: number) => {
    setRecordingTime(elapsedTime);

    if (!sessionId || !question) return;

    try {
      setPhase(ANSWER_PHASE.STT_LOADING);

      const extension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
      const audioFile = new File([audioBlob], `answer.${extension}`, { type: audioBlob.type });
      const { sttText } = await submitRecordApi({
        sessionId,
        questionId: question.questionId,
        extraQuestionId: question.extraQuestionId,
        audioFile,
      });

      setSttText(sttText);
      setPhase(ANSWER_PHASE.STT_DONE);
    } catch (error) {
      console.error('녹음 제출 실패:', error);
    }
  };

  const { stream, isRecording, formattedTime, toggleRecording } = useVoiceRecorder({
    timeLimit,
    onRecordFinish: handleRecordFinish,
  });

  const handleToggle = () => {
    if (!isRecording) {
      setPhase(ANSWER_PHASE.RECORDING);
    }
    toggleRecording();
  };

  const shouldShow =
    phase !== ANSWER_PHASE.FEEDBACK_LOADING && phase !== ANSWER_PHASE.FEEDBACK_DONE;

  if (!shouldShow) return null;

  return (
    <section className="flex flex-col items-center gap-6">
      <h3 className="sr-only">음성 답변</h3>
      <PulsingMicButton
        isRecording={isRecording}
        disabled={phase === ANSWER_PHASE.STT_LOADING}
        stream={stream}
        onToggle={handleToggle}
      />
      <p className="text-lg sm:text-2xl">
        <span className="text-dark-gray">남은 시간: </span>
        {formattedTime}
      </p>
    </section>
  );
};

export default VoiceRecorderSection;
