import * as Tooltip from '@radix-ui/react-tooltip';

import useAudioLevel from '../../lib/hooks/use-audio-level';
import { Mic, MicOff } from 'lucide-react';

type PulsingMicButtonProps = {
  isRecording: boolean;
  disabled?: boolean;
  stream: MediaStream | null;
  onToggle: () => void;
};

const PulsingMicButton = ({ isRecording, disabled, stream, onToggle }: PulsingMicButtonProps) => {
  const audioLevel = useAudioLevel(stream);

  // 음량에 따른 버튼 크기 (1.0 ~ 1.5 범위로 증가)
  const buttonScale = isRecording ? 1 + audioLevel * 2 : 1;

  // 음량에 따른 shadow 크기 (더 극적으로)
  const shadowSize = isRecording ? 20 + audioLevel * 60 : 20;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <Tooltip.Provider delayDuration={100}>
        <Tooltip.Root open={disabled ? undefined : false}>
          <Tooltip.Trigger asChild>
            <button
              onClick={onToggle}
              disabled={disabled}
              style={{
                transform: `scale(${buttonScale})`,
                boxShadow: isRecording
                  ? `0 0 ${shadowSize}px  rgba(0, 0, 0, 0.1)`
                  : '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-75 ease-out disabled:cursor-not-allowed disabled:bg-gray-400 ${
                isRecording ? 'bg-primary hover:bg-primary/70' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
            >
              {isRecording ? (
                <MicOff className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-gray-300" />
              )}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-10000 rounded-xl bg-black/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm select-none"
              side="bottom"
              sideOffset={15}
            >
              음성을 변환하고 있어요
              <Tooltip.Arrow className="fill-black/90" width={12} height={6} />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
};

export default PulsingMicButton;
