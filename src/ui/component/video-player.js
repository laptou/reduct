import { EventEmitter } from 'events';

const LOAD_STATE = {
  NONE: 0,
  LOADING: 1,
  READY: 2,
  ERROR: 3,
};

/**
 * This element handles the management of our video player, including click to
 * pause/unpause/restart.
 * @emits play Video has started playing.
 * @emits pause Video has been paused.
 * @emits end Video ended.
 * @emits load Video loaded.
 * @emits error There was an error while loading or playing the video.
 */
export default class VideoPlayer extends EventEmitter {
  /**
     *
     * @param {Element} el The `.video-player` container element.
     * @param {String?} uri The URI of the video to load.
     */
  constructor(el, uri) {
    super();
    this.uri = uri;
    this.loadState = LOAD_STATE.NONE;

    this.el = el;
    this.video = el.querySelector('video');

    this.onVideoClick = this.onVideoClick.bind(this);
    this.onVideoEnd = this.onVideoEnd.bind(this);
    this.onVideoLoad = this.onVideoLoad.bind(this);
    this.onVideoError = this.onVideoError.bind(this);

    this.el.addEventListener('click', this.onVideoClick);
    this.video.addEventListener('ended', this.onVideoEnd);
    this.video.addEventListener('load', this.onVideoLoad);
    this.video.addEventListener('error', this.onVideoError);
  }

  /**
     * Removes event handlers and cleans up this VideoPlayer instance
     * so that another VideoPlayer may be attached to these elements.
     */
  detach() {
    const { el, video } = this;
    // stop and unload video
    video.pause();
    video.removeAttribute('src');

    // remove event handlers
    el.removeEventListener('click', this.onVideoClick);
    video.removeEventListener('ended', this.onVideoClick);
    video.removeEventListener('load', this.onVideoClick);
    video.removeEventListener('error', this.onVideoClick);
  }

  /**
     * Loads the video if it was not loaded, then plays it.
     */
  async play() {
    const { video, el } = this;

    if (this.loadState === LOAD_STATE.NONE) {
      video.setAttribute('src', this.uri);
      video.load();
      this.loadState = LOAD_STATE.LOADING;
    }

    await video.play();

    el.classList.add('playing');
    el.classList.remove('paused', 'ended');
    this.emit('play');
  }

  /**
     * Pause the video.
     */
  pause() {
    const { video, el } = this;

    video.pause();
    el.classList.add('paused');
    el.classList.remove('playing', 'ended');
    this.emit('pause');
  }

  /**
     * @private
     */
  onVideoLoad() {
    this.loadState = LOAD_STATE.READY;
    this.emit('load');
  }

  /**
     * @private
     */
  onVideoError() {
    this.loadState = LOAD_STATE.ERROR;
    this.emit('error');
  }

  /**
     * @private
     */
  async onVideoClick() {
    const { video } = this;

    if (video.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  /**
     * @private
     */
  onVideoEnd() {
    const { el } = this;
    el.classList.add('ended');
    el.classList.remove('paused', 'playing');
    this.emit('end');
  }
}
