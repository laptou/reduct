import React from 'react';
import { connect } from 'react-redux';

import { createEnableSound } from '@/store/action/preferences';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/preferences.scss';
import { createToggleCredits } from '@/store/action/game';

interface PreferencesStoreProps {
  isSoundEnabled: boolean;
}

interface PreferencesDispatchProps {
  enableSound(enabled: boolean): void;
  toggleCredits(): void;
}

type PreferencesProps = PreferencesStoreProps & PreferencesDispatchProps;

const PreferencesImpl: React.FC<PreferencesProps> = (props) => {
  const {
    isSoundEnabled,
    enableSound,
    toggleCredits,
  } = props;

  return (
    <ul id='reduct-preferences'>
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
  }),
  (dispatch) => ({
    enableSound(enabled: boolean) { dispatch(createEnableSound(enabled)); },
    toggleCredits() { dispatch(createToggleCredits()); },
  })
)(PreferencesImpl);
