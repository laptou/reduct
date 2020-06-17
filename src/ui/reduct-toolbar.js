import * as gfx from '../gfx/core';

/**
 * Handle the play/pause/big-step toolbar for reducing expressions.
 *
 * These are rendered in HTML, and positioned to match their
 * corresponding expression. It does some work to recycle the toolbar
 * nodes and make sure they stay attached to the same expression
 * through reduction.
 *
 * @module ReductToolbar
 */
export default class ReductToolbar {
    constructor(stage) {
        this.stage = stage;

        // Map of node ID to [toolbox element, should stop reducing]
        this.ids = new Map();
        this.currentId = null;
        this.playing = false;

        // TODO: move this somewhere else
        // Remove any toolbars from the previous level
        for (const el of document.querySelectorAll('.reduct-toolbar:not(.reduct-toolbar-proto)')) {
            el.remove();
        }

        this._shouldStop = this.shouldStop.bind(this);
    }

    update(id, prevId = null) {
        const state = this.stage.getState();
        if (id !== null && (prevId === null || !this.ids.has(prevId))) {
            if (this.stage.semantics.kind(state, state.nodes.get(id)) !== 'expression') {
                return;
            }

            const elToolbar = document.querySelector('.reduct-toolbar-proto').cloneNode(true);
            elToolbar.classList.remove('reduct-toolbar-proto');
            elToolbar.dataset.id = id;

            document.body.appendChild(elToolbar);
            this.ids.set(id, { el: elToolbar, shouldStop: false });

            const btnFfwd = elToolbar.querySelector('.toolbar-ffwd');
            const btnPlayPause = elToolbar.querySelector('.toolbar-play, .toolbar-pause');

            btnFfwd.addEventListener('click', () => this.ffwd(parseInt(elToolbar.dataset.id, 10)));
            btnPlayPause.addEventListener('click', () => {
                this.playing = !this.playing;

                if (!this.playing) {
                    elToolbar.classList.remove('reduct-toolbar-playing');
                    this.pause(parseInt(elToolbar.dataset.id, 10));
                } else {
                    elToolbar.classList.add('reduct-toolbar-playing');
                    this.play(parseInt(elToolbar.dataset.id, 10));
                }

                // Reposition buttons
                this.drawImpl(this.stage.getState());
            });
        } else if (this.ids.has(prevId)) {
            const idRecord = this.ids.get(prevId);
            this.ids.delete(prevId);
            if (id !== null
                && this.stage.semantics.kind(state, state.nodes.get(id)) === 'expression') {
                this.ids.set(id, idRecord);
                idRecord.el.dataset.id = id;
            } else {
                idRecord.el.remove();
            }
        }
    }

    drawImpl(state) {
        const offsetX = this.stage.sidebarWidth;
        const offsetY = this.stage.canvas.offsetTop;

        const board = state.board;
        const toDelete = [];

        for (const [id, { el: toolbar }] of this.ids.entries()) {
            if (!board.includes(id)) {
                toDelete.push(id);
                continue;
            }

            const view = this.stage.getView(id);
            const absPos = gfx.absolutePos(view);
            const absSize = gfx.absoluteSize(view);

            let posTop = absPos.y + absSize.h + offsetY;
            let posLeft = (absPos.x - (toolbar.clientWidth / 2))
                  + (absSize.w / 2)
                  + offsetX;

            // TODO: refactor this to stage?
            if (gfx.viewport.IS_PHONE) {
                posTop *= 1.33;
                posLeft *= 1.33;
            }

            toolbar.style.top = `${posTop}px`;
            toolbar.style.left = `${posLeft}px`;
        }

        toDelete.forEach((id) => this.update(null, id));
    }

    shouldStop(id) {
        if (this.ids.has(id)) {
            return this.ids.get(id).shouldStop;
        }
        return false;
    }

    play(id) {
        if (this.ids.has(id)) {
            this.ids.get(id).shouldStop = false;
        }
        this.stage.step(this.stage.getState(), id, 'multi', this._shouldStop);
    }

    pause(id) {
        if (this.ids.has(id)) {
            this.ids.get(id).shouldStop = true;
        }
    }

    ffwd(id) {
        // TODO: LOGGING
        if (this.ids.has(id)) {
            this.ids.get(id).shouldStop = false;
        }
        this.stage.step(this.stage.getState(), id, 'big');
    }

    skip(id) {
        // TODO: LOGGING
        if (this.ids.has(id)) {
            this.ids.get(id).shouldStop = false;
        }
        this.stage.step(this.stage.getState(), id, 'big');
    }
}
