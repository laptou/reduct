import { audios, audioSprites } from '@/loader';
import { store } from '@/store';

function getIsSoundEnabled() {
  return store.getState().preferences.enableSounds;
}

export function playSound(key) {
  if (!getIsSoundEnabled()) return;

  const sprite = audioSprites.get(key);

  if (sprite) {
    return sprite.play(key);
  }

  const audio = audios.get(key);

  if (audio) {
    return audio.play();
  }

  console.warn(`@AudioEngine#play: could not find sound ${key}`);
}

export function stopSound(key, handle) {
  const sound = audios.get(key);

  if (!sound) {
    console.warn(`@AudioEngine#play: could not find sound ${key}`);
    return;
  }

  return sound.stop(handle);
}
