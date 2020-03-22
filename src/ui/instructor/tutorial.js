import VideoPlayer from "../video-player";
import ModalOverlay from "../modal-overlay";


/**
 * @member {String} uri The URI of the video that this Tutorial instance should play.
 * @member {Boolean} active Whether this Tutorial is currently active.
 */
export default class Tutorial extends ModalOverlay {
    constructor(uri, autoplay = true) {
        const container = document.querySelector("#tutorial");
        super(container);

        this.autoplay = autoplay;
        this.btnSkip = container.querySelector("#tutorial-continue");
        this.videoPlayer = new VideoPlayer(container.querySelector(".video-player"), uri);

        this.onSkipClick = this.onSkipClick.bind(this);
    }

    /**
     * Starts playing the tutorial.
     */
    play() {
        this.videoPlayer.play();
    }

    pause() {
        this.videoPlayer.pause();
    }

    /**
     * Shows the tutorial to the user.
     * @returns {Tutorial} `this`
     */
    show() {
        super.show();

        this.btnSkip.addEventListener("click", this.onSkipClick);
        if (this.autoplay) {
            this.play();
        }

        return this;
    }

    /**
     * Dismisses the tutorial and cleans up event handlers.
     * @returns {Tutorial} `this`
     */
    dismiss() {
        // remove event handlers
        this.btnSkip.removeEventListener("click", this.onSkipClick);

        return super.dismiss();
    }

    /**
     * @private
     */
    onSkipClick() {
        this.dismiss();
    }
}
