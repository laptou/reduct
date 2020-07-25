import { PreferenceState } from '../state';

const initialState: PreferenceState = {
  enableSounds: true,
};

export const preferencesReducer = (state: PreferenceState = initialState) => {
  return state;
};
