import { Howler } from 'howler';

import Loader from '../loader';

import { store } from '@/store';


class AudioEngine {
  constructor() {
    this.enabled = store.getState().preferences.enableSounds;

    store.subscribe(() => {
      this.enabled = store.getState().preferences.enableSounds;
    });
  }

  play(sound) {
    if (!this.enabled) return;

    if (!Loader.sounds[sound]) {
      console.error(`@AudioEngine#play: could not find sound ${sound}`);
      return null;
    }
    const id = Loader.sounds[sound].play(sound);

    if (Loader.audioVolumes[sound]) {
      Loader.sounds[sound].volume(Loader.audioVolumes[sound], id);
    }

    return id;
  }

  stop(sound, id) {
    if (!Loader.sounds[sound]) {
      console.error(`@AudioEngine#play: could not find sound ${sound}`);
      return;
    }
    Loader.sounds[sound].stop(id);
  }

  playSeries(sounds) {
    if (!this.enabled) return;
    for (const sound of sounds) {
      if (!Loader.sounds[sound]) {
        console.error(`@AudioEngine#play: could not find sound ${sound}`);
        return;
      }
    }
    const queue = sounds.slice().reverse(); // Copy sound list
    const step = () => {
      if (queue.length === 0) return;

      const sound = queue.pop();
      const id = this.play(sound);
      Loader.sounds[sound].on('end', step, id);
    };
    step();
  }
}

const Audio = new AudioEngine();

export default Audio;
