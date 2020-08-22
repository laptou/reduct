import React from 'react';
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

  return (
    <ul id='reduct-preferences'>
      <li>
        <span className='reduct-preference-name'>time remaining:</span>
        &nbsp;
        <span>{endTime}</span>
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
