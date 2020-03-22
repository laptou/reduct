import { EventEmitter } from "events";


const LOAD_STATE = {
    NONE: 0,
    LOADING: 1,
    READY: 2,
    ERROR: 3,
};

/**
 * @emits play
 * @emits pause
 * @emits end
 * @emits load
 * @emits error
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
        this.video = el.querySelector("video");

        this.onVideoClick = this.onVideoClick.bind(this);
        this.onVideoEnd = this.onVideoEnd.bind(this);
        this.onVideoLoad = this.onVideoLoad.bind(this);

        this.el.addEventListener("click", this.onVideoClick);
        this.video.addEventListener("ended", this.onVideoEnd);
        this.video.addEventListener("load", this.onVideoLoad);
        this.video.addEventListener("error", this.onVideoError);
    }

    detach() {
        const { el, video } = this;
        // stop and unload video
        video.pause();
        video.removeAttribute("src");

        // remove event handlers
        el.removeEventListener("click", this.onVideoClick);
        video.removeEventListener("ended", this.onVideoClick);
        video.removeEventListener("load", this.onVideoClick);
        video.removeEventListener("error", this.onVideoClick);
    }

    play() {
        const { video, el } = this;

        if (this.loadState === LOAD_STATE.NONE) {
            video.setAttribute("src", this.uri);
            video.load();
            this.loadState = LOAD_STATE.LOADING;
        }

        video.play();

        el.classList.add("playing");
        el.classList.remove("paused", "ended");
        this.emit("play");
    }

    pause() {
        const { video, el } = this;

        video.pause();
        el.classList.add("paused");
        el.classList.remove("playing", "ended");
        this.emit("pause");
    }

    /**
     * @private
     */
    onVideoLoad() {
        this.loadState = LOAD_STATE.READY;
        this.emit("load");
    }

    /**
     * @private
     */
    onVideoError() {
        this.loadState = LOAD_STATE.ERROR;
        this.emit("error");
    }

    /**
     * @private
     */
    onVideoClick() {
        const { video } = this;

        if (video.paused) {
            this.play();
        }
        else {
            this.pause();
        }
    }

    /**
     * @private
     */
    onVideoEnd() {
        const { el } = this;
        el.classList.add("ended");
        el.classList.remove("paused", "playing");
        this.emit("end");
    }
}
