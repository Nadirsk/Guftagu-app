import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Counts down to zero, one second at a time. `start` restarts it from scratch,
 * and the interval only exists while there is time left on the clock.
 */
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number) => {
      clear();
      setSecondsLeft(seconds);
      timer.current = setInterval(() => {
        setSecondsLeft((remaining) => {
          if (remaining <= 1) {
            clear();
            return 0;
          }
          return remaining - 1;
        });
      }, 1000);
    },
    [clear],
  );

  // Leaving the screen mid-countdown would otherwise keep the interval running.
  useEffect(() => clear, [clear]);

  return { secondsLeft, start };
}
