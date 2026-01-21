import { ANSWER_PHASE, useAnswerFlow } from '@/features/learning/lib/contexts/answer-flow-context';
import { useVoiceRecorder } from '@/features/learning/lib/hooks/use-voice-recorder';
import useLearningSession from '@/lib/stores/learning-session';

import PulsingMicButton from './pulsing-mic-button';

type VoiceRecorderSectionProps = {
  onRecordingComplete: (audioBlob: Blob, recordingTime: number) => void;
};

const VoiceRecorderSection = ({ onRecordingComplete }: VoiceRecorderSectionProps) => {
  const question = useLearningSession((state) => state.question);
  const { phase, setPhase, setRecordingTime } = useAnswerFlow();

  const handleRecordFinish = (audioBlob: Blob) => {
    const elapsedTime = (question?.timeLimit ?? 300) - remainingTime;
    setRecordingTime(elapsedTime);
    onRecordingComplete(audioBlob, elapsedTime);
  };

  const { stream, isRecording, remainingTime, formattedTime, toggleRecording } = useVoiceRecorder({
    timeLimit: question?.timeLimit ?? 300,
    onRecordFinish: handleRecordFinish,
  });

  const handleToggle = () => {
    if (!isRecording) {
      setPhase(ANSWER_PHASE.RECORDING);
    }
    toggleRecording();
  };

  const shouldShow = phase === ANSWER_PHASE.IDLE || phase === ANSWER_PHASE.RECORDING;

  if (!shouldShow) return null;

  return (
    <section className="flex flex-col items-center gap-6">
      <h3 className="sr-only">음성 답변</h3>
      <PulsingMicButton isRecording={isRecording} stream={stream} onToggle={handleToggle} />
      <p className="text-lg sm:text-2xl">
        <span className="text-dark-gray">남은 시간: </span>
        {formattedTime}
      </p>
    </section>
  );
};

export default VoiceRecorderSection;
