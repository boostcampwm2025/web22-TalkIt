import { useEffect, useState } from 'react';

export const useProgressAnimation = (
  currentXp: number,
  requiredXp: number,
  delay: number = 100,
) => {
  const [progress, setProgress] = useState(0);

  const calculatedPercent = Math.round((currentXp / requiredXp) * 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(calculatedPercent);
    }, delay);

    return () => clearTimeout(timer);
  }, [calculatedPercent, delay]);

  return { progress, calculatedPercent };
};
