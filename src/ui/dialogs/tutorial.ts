import VideoPlayer from '../component/video-player';
import ModalDialog from '../component/modal-dialog';


/**
 * @member {String} uri The URI of the video that this Tutorial instance should play.
 * @member {Boolean} active Whether this Tutorial is currently active.
 */
export default class TutorialDialog extends ModalDialog {
    private videoPlayer: VideoPlayer | null;

    private readonly btnSkip: Element;

    public autoplay: boolean;

    public constructor(autoplay = true) {
        const container = document.querySelector('#tutorial')!;
        super(container, { allowSoftDismiss: true });

        this.autoplay = autoplay;
        this.btnSkip = container.querySelector('#tutorial-continue')!;
        this.videoPlayer = null;

        this.onSkipClick = this.onSkipClick.bind(this);
    }

    private onSkipClick() {
        this.dismiss();
    }

    public async load(key: string) {
        this.videoPlayer = new VideoPlayer(
            this.el.querySelector('.video-player')!,
            await import(`@resources/videos/${key}.mp4`)
                .then((mod) => mod.default)
                .catch((err) => console.error('failed to load tutorial', err))
        );
        return this;
    }

    /**
     * Starts playing the tutorial.
     */
    public play() {
        this.videoPlayer?.play();
    }

    public pause() {
        this.videoPlayer?.pause();
    }

    public show(): this {
        super.show();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.btnSkip.addEventListener('click', this.onSkipClick);
        if (this.autoplay) {
            this.play();
        }

        return this;
    }

    /**
     * Dismisses the tutorial and cleans up event handlers.
     * @returns {this} `this`
     */
    public dismiss() {
        // remove event handlers
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.btnSkip.removeEventListener('click', this.onSkipClick);
        this.videoPlayer?.pause();
        this.videoPlayer?.detach();

        return super.dismiss();
    }
}
