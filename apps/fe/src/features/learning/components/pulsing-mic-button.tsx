import useAudioLevel from '../lib/hooks/use-audio-level';
import { Mic, MicOff } from 'lucide-react';

type PulsingMicButtonProps = {
  isRecording: boolean;
  stream: MediaStream | null;
  onToggle: () => void;
};

const PulsingMicButton = ({ isRecording, stream, onToggle }: PulsingMicButtonProps) => {
  const audioLevel = useAudioLevel(stream);

  // 음량에 따른 버튼 크기 (1.0 ~ 1.5 범위로 증가)
  const buttonScale = isRecording ? 1 + audioLevel * 2 : 1;

  // 음량에 따른 shadow 크기 (더 극적으로)
  const shadowSize = isRecording ? 20 + audioLevel * 60 : 20;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <button
        onClick={onToggle}
        style={{
          transform: `scale(${buttonScale})`,
          boxShadow: isRecording
            ? `0 0 ${shadowSize}px  rgba(0, 0, 0, 0.1)`
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-75 ease-out ${
          isRecording ? 'bg-primary hover:bg-primary/70' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {isRecording ? (
          <MicOff className="h-10 w-10 text-white" />
        ) : (
          <Mic className="h-10 w-10 text-gray-300" />
        )}
      </button>
    </div>
  );
};

export default PulsingMicButton;
