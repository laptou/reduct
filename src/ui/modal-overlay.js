import { EventEmitter } from "events";


/**
 * @typedef {Object} ModalOverlayOptions
 * @property {Boolean?} allowSoftDismiss Controls whether this modal is soft-
 * dismissable.
 */

/**
 * Modal overlays that the user should interact with.
 * @property {Boolean} visible Whether this modal is currently visible.
 * @emits dismissed
 */
export default class ModalOverlay extends EventEmitter {
    /**
     * @param {Element} el The `.modal-overlay` container element.
     * @param {ModalOverlayOptions?} options
     */
    constructor(el, options = { allowSoftDismiss: false }) {
        super();

        this.visible = false;
        this.el = el;
        this.options = { allowSoftDismiss: true, ...options };
        this.innerEl = el.querySelector(".modal-overlay-inner");
    }

    /**
     * Shows the tutorial to the user.
     * @returns {Tutorial} `this`
     */
    show() {
        if (this.dismissed) {
            throw new Error("This tutorial was already dismissed. Create a new Tutorial object.");
        }

        if (this.autoplay) {
            this.play();
        }

        if (this.visible) return this;
        this.visible = true;

        const { el, innerEl } = this;

        innerEl.addEventListener("click", ModalOverlay.onDialogClick);
        el.addEventListener("click", this.onBackgroundClick);
        el.classList.add("visible");

        return this;
    }

    /**
     * Dismisses the tutorial and cleans up event handlers.
     * @returns {Tutorial} `this`
     */
    dismiss() {
        const {
            el, innerEl,
        } = this;

        // make this invisible
        el.classList.remove("visible");
        this.visible = false;

        // remove event handlers
        el.addEventListener("click", this.onDismissClick);
        innerEl.removeEventListener("click", ModalOverlay.onDialogClick);

        // TODO: wait for CSS transition?

        // emit dismiss event
        this.emit("dismiss");
        this.dismissed = true;

        return this;
    }

    /**
     * Waits until this modal is dismissed by the user.
     * @returns {Promise<void>} A Promise that resolves when this modal is dismissed by the user.
     */
    wait() {
        return new Promise((resolve) => {
            if (!this.visible) resolve();
            this.once("dismiss", resolve);
        });
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
    onBackgroundClick() {
        if (this.options.allowSoftDismiss) this.dismiss();
    }
}
