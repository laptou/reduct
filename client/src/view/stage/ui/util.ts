import { useEffect, useRef } from 'react';

export function useTimer(callback: () => void, interval: number, enable: boolean): void {
  const timerHandle = useRef<number>();

  useEffect(() => {
    if (enable) timerHandle.current = setInterval(callback, interval);
    return () =>  clearInterval(timerHandle.current);
  }, [callback, enable, interval]);
}
