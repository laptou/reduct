import React, {
  useCallback, useState, useEffect, useRef, useMemo,
} from 'react';
import { connect } from 'react-redux';

import { createEnableSound } from '@/store/action/preferences';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/preferences.scss';
import { createToggleCredits } from '@/store/action/game';
import { GAME_TIME_LIMIT } from '@/util/constants';

interface PreferencesStoreProps {
  isSoundEnabled: boolean;
  isResearchEnabled: boolean;
  endTime: number;
}

interface PreferencesDispatchProps {
  enableSound(enabled: boolean): void;
  toggleCredits(): void;
}

type PreferencesProps = PreferencesStoreProps & PreferencesDispatchProps;

const PreferencesImpl: React.FC<PreferencesProps> = (props) => {
  const {
    isSoundEnabled,
    isResearchEnabled,
    endTime,
    enableSound,
    toggleCredits,
  } = props;

  const [currentTime, setCurrentTime] = useState(+new Date());

  const timerRef = useRef<number>();

  const timerCallback = useCallback(() => {
    setCurrentTime(+new Date());
  }, []);

  useEffect(() => {
    if (currentTime < endTime) {
      timerRef.current = setTimeout(timerCallback, 1000) as unknown as number;

      return () => {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      };
    }
  }, [currentTime, endTime, timerCallback]);

  const remainingTime = useMemo(
    () => {
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
    <ul id='reduct-preferences'>
      <li>
        <span className='reduct-preference-name'>time remaining:</span>
        &nbsp;
        <span>
          {
            remainingTime.hours > 1 ? `${remainingTime.hours} hours, ${remainingTime.minutes} minutes`
              : remainingTime.hours > 0 ? `1 hour, ${remainingTime.minutes} minutes`
                : remainingTime.minutes > 0 ? `${remainingTime.minutes} minutes`
                  : `${remainingTime.seconds} seconds`
          }
        </span>
      </li>
      <li>
        <span className='reduct-preference-name'>sound enabled:</span>
        &nbsp;
        <input
          type='checkbox'
          checked={isSoundEnabled}
          onChange={e => enableSound(e.target.checked)}
        />
      </li>
      <li>
        <span className='reduct-preference-name'>research data collection enabled:</span>
        &nbsp;
        <input
          type='checkbox'
          checked={isResearchEnabled}
          disabled
        />
      </li>
      <li>
        <span className='reduct-preference-name'>game version:</span>
        &nbsp;
        {PKG_VERSION}
      </li>
      <li>
        <a href="#" onClick={() => toggleCredits()}>view credits</a>
      </li>
    </ul>
  );
};

export const Preferences = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isSoundEnabled: store.preferences.enableSounds,
    isResearchEnabled: store.preferences.enableResearch,
    endTime: store.stats.startTime ? +store.stats.startTime + GAME_TIME_LIMIT : null,
  }),
  (dispatch) => ({
    enableSound(enabled: boolean) { dispatch(createEnableSound(enabled)); },
    toggleCredits() { dispatch(createToggleCredits()); },
  })
)(PreferencesImpl);
