import { PreferenceState } from '../state';
import { PreferenceAction, PreferenceActionKind } from '../action/preferences';

const initialState: PreferenceState = {
  enableSounds: true,
};

export const preferencesReducer = (
  state: PreferenceState = initialState, 
  act?: PreferenceAction
): PreferenceState => {
  if (!act) return state;

  switch (act.type) {
  case PreferenceActionKind.EnableSound:
    return {
      ...state,
      enableSounds: act.enabled, 
    };
  default:
    return state;
  }
};
