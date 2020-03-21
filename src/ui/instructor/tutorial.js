import { EventEmitter } from "events";

/**
 * @member {String} uri The URI of the video that this Tutorial instance should play.
 * @member {Boolean} active Whether this Tutorial is currently active.
 * @emits dismissed This tutorial has been dismissed by the user.
 */
export default class Tutorial extends EventEmitter {
    constructor(uri) {
        super();

        this.uri = uri;
        this.active = false;
        this.dismissed = false;

        this.container = document.querySelector("#tutorial");
        this.innerContainer = this.container.querySelector("#tutorial-inner");
        this.video = this.container.querySelector("video");
        this.skipBtn = this.container.querySelector("#tutorial-continue");

        this.onVideoClick = this.onVideoClick.bind(this);
        this.onDismissClick = this.onDismissClick.bind(this);

        this.video.addEventListener("click", this.onVideoClick);
    }

    /**
     * Shows the tutorial to the user.
     * @returns {Tutorial} `this`
     */
    show() {
        if (this.dismissed) {
            throw new Error("This tutorial was already dismissed. Create a new Tutorial object.");
        }

        const {
            video, container, innerContainer, skipBtn,
        } = this;

        video.setAttribute("src", this.uri);
        video.load();
        video.play();

        this.active = true;

        skipBtn.addEventListener("click", this.onDismissClick);
        innerContainer.addEventListener("click", Tutorial.onDialogClick);
        container.addEventListener("click", this.onDismissClick);
        container.classList.add("visible");

        return this;
    }

    /**
     * Dismisses the tutorial and cleans up event handlers.
     * @returns {Tutorial} `this`
     */
    dismiss() {
        const {
            video, container, innerContainer, skipBtn,
        } = this;

        // pause video
        video.pause();

        // make this invisible
        container.classList.remove("visible");

        // remove event handlers
        video.removeEventListener("click", this.onVideoClick);
        innerContainer.removeEventListener("click", Tutorial.onDialogClick);
        skipBtn.addEventListener("click", this.onDismissClick);
        container.addEventListener("click", this.onDismissClick);

        // TODO: wait for CSS transition?

        // emit dismiss event
        this.emit("dismiss");
        this.dismissed = true;

        return this;
    }

    /**
     * Waits until this tutorial is dismissed by the user.
     * @returns {Promise<void>} A Promise that resolves when this tutorial is dismissed by the user.
     */
    wait() {
        return new Promise((resolve) => {
            if (!this.active) resolve();
            this.once("dismiss", resolve);
        });
    }

    /**
     * @private
     */
    onVideoClick() {
        const { video } = this;

        if (video.paused) video.play();
        else video.pause();
    }

    /**
     * @private
     * @param {UIEvent} evt
     */
    static onDialogClick(evt) {
        // don't allow click to bubble to parent element
        // so that video is not accidentally dismissed
        evt.stopPropagation();
    }

    /**
     * @private
     */
    onDismissClick() {
        this.dismiss();
    }
}
