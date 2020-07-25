import Loader from '@/loader';
import { createStartLevel } from '@/store/action';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import React from 'react';
import { connect } from 'react-redux';

interface PreferencesStoreProps {
  isSoundEnabled: boolean;
}

interface PreferencesDispatchProps {
  enableSound(enabled: boolean): void;
}

type PreferencesProps = PreferencesStoreProps & PreferencesDispatchProps;

const PreferencesImpl: React.FC<PreferencesProps> = (props) => {
  return (
    <div>
      sound enabled: <input type='checkbox' checked={props.isSoundEnabled} />
    </div>
  );
};

export const Preferences = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isSoundEnabled: store.preferences.enableSounds,
  }),
  (dispatch) => ({
    enableSound(enabled: boolean) { /* TODO */ },
  })
)(PreferencesImpl);
