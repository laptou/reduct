import { Howler } from 'howler';

import { audios } from '@/loader';
import { store } from '@/store';

function getIsSoundEnabled() {
  return store.getState().preferences.enableSounds;
}

export function playSound(key) {
  if (!getIsSoundEnabled()) return;

  const sound = audios.get(key);

  if (!sound) {
    console.warn(`@AudioEngine#play: could not find sound ${key}`);
    return;
  }

  return sound.play(key);
}

export function stopSound(key, handle) {
  const sound = audios.get(key);

  if (!sound) {
    console.warn(`@AudioEngine#play: could not find sound ${key}`);
    return;
  }

  return sound.stop(handle);
}
