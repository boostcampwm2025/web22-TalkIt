import { useEffect, useRef, useState } from 'react';

type UseTimerProps = {
  timeLimit: number;
  isActive: boolean;
  onTimeEnd?: (elapsedTime: number) => void;
};

type UseTimerReturn = {
  remainingTime: number;
  formattedTime: string;
  getElapsedTime: () => number;
};

export const useTimer = ({ timeLimit, isActive, onTimeEnd }: UseTimerProps): UseTimerReturn => {
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef<number>(0);

  const formattedTime = `${String(Math.floor(remainingTime / 60)).padStart(2, '0')}:${String(remainingTime % 60).padStart(2, '0')}`;

  const getElapsedTime = () => elapsedTimeRef.current;

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      elapsedTimeRef.current = 0;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        elapsedTimeRef.current = elapsed;
        const remaining = timeLimit - elapsed;
        setRemainingTime(remaining > 0 ? remaining : 0);

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onTimeEnd?.(elapsedTimeRef.current);
        }
      }, 100);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        startTimeRef.current = null;
      };
    }
  }, [isActive, timeLimit, onTimeEnd]);

  return {
    remainingTime,
    formattedTime,
    getElapsedTime,
  };
};
