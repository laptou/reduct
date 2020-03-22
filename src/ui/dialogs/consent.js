import { autobind } from 'core-decorators';
import ModalDialog from "../component/modal-dialog";

// Report whether a player id is acceptable
function playerIdOK() {
    const id = parseInt(document.getElementById("player_id").value, 10);
    if ((id >= 56000 && id < 58000) || id === 1234 || id === 513) return true;
    return false;
}

@autobind
export default class ConsentDialog extends ModalDialog {
    constructor() {
        const el = document.querySelector("#consent");
        super(el);

        this.onAllow = this.onAllow.bind(this);
        this.onReject = this.onReject.bind(this);

        this.btnAllow = el.querySelector("#consent-agree");
        this.btnReject = el.querySelector("#consent-disagree");
    }

    show() {
        super.show();

        this.btnAllow.addEventListener("click", this.onAllow);
        this.btnReject.addEventListener("click", this.onReject);

        return this;
    }

    dismiss() {
        // remove event handlers
        this.btnAllow.removeEventListener("click", this.onAllow);
        this.btnReject.removeEventListener("click", this.onReject);

        super.dismiss();

        return this;
    }

    /**
     * Unlike the base `wait()` method, which resolves to nothing,
     * this will resolve to `true` if the user consented, or `false`
     * if they refused.
     * @returns {Promise<boolean>}
     */
    wait() {
        return new Promise((resolve) => {
            if (!this.visible) resolve(false);
            this.once("allow", () => resolve(true));
            this.once("deny", () => resolve(false));
            this.once("dismiss", () => resolve());
        });
    }

    /** @private */
    onAllow() {
        this.emit("allow");
        this.dismiss();
    }

    /** @private */
    onReject() {
        this.emit("reject");
        this.dismiss();
    }
}

// Handle asking for consent. A valid user id is requested
// (according to playerIdOK) if user_ids is true.

/*
export default function consent(userIds) {
    // NOTE: #consent-request-id element is currently commented out in HTML
    if (userIds) {
        Array.prototype.forEach.call(
            document.getElementsByClassName("consent-request-id"),
            (e) => {
                e.style.display = "inline";
            },
        );
    }

    // TODO: use userIds
    return new ConsentDialog(userIds).show().wait();
}
*/
