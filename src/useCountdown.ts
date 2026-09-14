import { useEffect, useMemo, useState } from 'react';

export function useCountdown(durationSeconds: number, isRunning: boolean, onComplete: () => void) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      onComplete();
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, remaining, onComplete]);

  const progress = useMemo(() => {
    if (durationSeconds <= 0) return 100;
    return Math.min(100, Math.max(0, ((durationSeconds - remaining) / durationSeconds) * 100));
  }, [durationSeconds, remaining]);

  return { remaining, progress, reset: () => setRemaining(durationSeconds) };
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
