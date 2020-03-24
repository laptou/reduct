import VideoPlayer from "../component/video-player";
import ModalDialog from "../component/modal-dialog";


/**
 * @member {String} uri The URI of the video that this Tutorial instance should play.
 * @member {Boolean} active Whether this Tutorial is currently active.
 */
export default class TutorialDialog extends ModalDialog {
    constructor(uri, autoplay = true) {
        const container = document.querySelector("#tutorial");
        super(container, { allowSoftDismiss: true });

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
     * @returns {this} `this`
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
     * @returns {this} `this`
     */
    dismiss() {
        // remove event handlers
        this.btnSkip.removeEventListener("click", this.onSkipClick);
        this.videoPlayer.pause();
        this.videoPlayer.detach();

        return super.dismiss();
    }

    /**
     * @private
     */
    onSkipClick() {
        this.dismiss();
    }
}
