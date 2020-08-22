import React, {
  useCallback, useState, useEffect, useRef, useMemo,
} from 'react';
import { connect } from 'react-redux';

import { DeepReadonly } from '@/util/helper';
import { GlobalState } from '@/store/state';
import { GAME_TIME_LIMIT } from '@/util/constants';

interface GameTimerStoreProps {
  endTime: number | null;
}

const GameTimerImpl: React.FC<GameTimerStoreProps> = (props) => {
  const { endTime } = props;

  const [currentTime, setCurrentTime] = useState(+new Date());

  const timerRef = useRef<number>();

  const timerCallback = useCallback(() => {
    setCurrentTime(+new Date());
  }, []);

  useEffect(() => {
    if (endTime && currentTime < endTime) {
      timerRef.current = setTimeout(timerCallback, 1000) as unknown as number;

      return () => {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      };
    }
  }, [currentTime, endTime, timerCallback]);

  const remainingTime = useMemo(
    () => {
      if (!endTime) {
        return {
          seconds: Number.POSITIVE_INFINITY,
          minutes: Number.POSITIVE_INFINITY,
          hours: Number.POSITIVE_INFINITY,
        };
      }

      const totalMillis = endTime - currentTime;
      const totalSeconds = Math.floor(totalMillis / 1000);
      const totalMinutes = Math.floor(totalMillis / 60 / 1000);
      const totalHours = Math.floor(totalMillis / 60 / 60 / 1000);

      return {
        seconds: totalSeconds % 60,
        minutes: totalMinutes % 60,
        hours: totalHours,
      };
    },
    [currentTime, endTime]
  );

  return (
    <span>
      {
        remainingTime.hours > 1 ? `${remainingTime.hours} hours, ${remainingTime.minutes} minutes`
          : remainingTime.hours > 0 ? `1 hour, ${remainingTime.minutes} minutes`
            : remainingTime.minutes > 0 ? `${remainingTime.minutes} minutes`
              : `${remainingTime.seconds} seconds`
      }
    </span>
  );
};

export const GameTimer = connect(
  (store: DeepReadonly<GlobalState>) => ({
    endTime: store.stats.startTime ? +store.stats.startTime + GAME_TIME_LIMIT : null,
  })
)(GameTimerImpl);
