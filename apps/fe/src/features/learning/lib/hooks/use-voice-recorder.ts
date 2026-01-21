import { useCallback, useEffect, useRef, useState } from 'react';

import { useTimer } from './use-timer';

type UseVoiceRecorderProps = {
  timeLimit: number;
  onRecordFinish?: (audioBlob: Blob, elapsedTime: number) => void;
};

type UseVoiceRecorderReturn = {
  stream: MediaStream | null;
  isRecording: boolean;
  formattedTime: string;
  audioBlob: Blob | null;
  toggleRecording: () => void;
};

export const useVoiceRecorder = ({
  timeLimit,
  onRecordFinish,
}: UseVoiceRecorderProps): UseVoiceRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const { formattedTime, getElapsedTime } = useTimer({
    timeLimit,
    isActive: isRecording,
    onTimeEnd: stopRecording,
  });

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);

        const elapsedTime = getElapsedTime();
        onRecordFinish?.(blob, elapsedTime);

        mediaStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('마이크 권한이 필요합니다.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    stream,
    isRecording,
    formattedTime,
    audioBlob,
    toggleRecording,
  };
};
