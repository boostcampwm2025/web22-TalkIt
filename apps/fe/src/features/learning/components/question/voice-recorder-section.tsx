import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession, { ANSWER_PHASE } from '@/lib/stores/learning-session';

import PulsingMicButton from './pulsing-mic-button';

type VoiceRecorderSectionProps = {
  onRecordingComplete: (audioBlob: Blob, recordingTime: number) => void;
};

const VoiceRecorderSection = ({ onRecordingComplete }: VoiceRecorderSectionProps) => {
  const question = useLearningSession((state) => state.question);
  const phase = useLearningSession((state) => state.phase);
  const setPhase = useLearningSession((state) => state.setPhase);
  const setRecordingTime = useLearningSession((state) => state.setRecordingTime);

  const timeLimit = question?.timeLimit ?? 300;

  const handleRecordFinish = (audioBlob: Blob, elapsedTime: number) => {
    setRecordingTime(elapsedTime);
    onRecordingComplete(audioBlob, elapsedTime);
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
