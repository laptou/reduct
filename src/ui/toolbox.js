import * as gfx from "../gfx/core";
import * as animate from "../gfx/animate";
import Loader from "../loader";

export default class Toolbox {
    constructor(stage) {
        this.stage = stage;
        this.bg = stage.allocateInternal(gfx.layout.sticky(gfx.layout.hexpand(gfx.sprite({
            image: Loader.images["toolbox-bg"],
            size: { h: 90 },
        })), "bottom"));

        this.infBg = stage.allocateInternal(gfx.shapes.circle({
            size: { w: 40, h: 40 },
            color: "#0D0",
        }));
        this.inf = stage.allocateInternal(gfx.sprite({
            image: Loader.images["infinity-symbol"],
            size: { h: 12, w: 25 },
        }));

        this._firstRender = true;
    }

    containsPoint(pos) {
        return pos.y >= this.stage.internalViews[this.bg].pos.y;
    }

    get pos() {
        return this.stage.internalViews[this.bg].pos;
    }

    getNodeAtPos(state, pos) {
        if (!this.containsPoint(pos)) return [ null, null ];

        for (const nodeId of state.get("toolbox")) {
            if (!this.stage.semantics.targetable(state, state.get("nodes").get(nodeId))) {
                continue;
            }
            const projection = this.stage.views[nodeId];

            if (projection.containsPoint(pos, { x: 0, y: 0, sx: 1, sy: 1 })) {
                return [ nodeId, nodeId ];
            }
        }

        return [ null, null ];
    }

    drawBase(state) {
        this.stage.internalViews[this.bg].prepare(null, null, state, this.stage);
        this.stage.internalViews[this.bg].draw(null, null, state, this.stage, {
            x: 0,
            y: 0,
            sx: 1,
            sy: 1,
        });
    }

    drawImpl(state) {
        let x = 20;
        const y = this.stage.internalViews[this.bg].pos.y;
        let i = 0;

        for (const nodeId of state.get("toolbox")) {
            const projection = this.stage.views[nodeId];
            projection.scale = { x: 1, y: 1 };
            const nodeY = y + ((90 - projection.size.h) / 2);
            projection.prepare(nodeId, nodeId, state, this.stage);
            if (nodeId === this.stage._selectedNode) {
                // Do nothing
            }
            else if (this._firstRender) {
                projection.pos.x = x + 800;
                projection.pos.y = nodeY;
                projection.animating = true;
                animate
                    .tween(projection.pos, { x }, {
                        easing: animate.Easing.Cubic.Out,
                        duration: 250,
                    })
                    .delay(350 * Math.log(2 + i))
                    .then(() => {
                        projection.animating = false;
                    });
            }
            else if (projection.pos.x !== x && !projection.animating && !this._firstRender) {
                projection.animating = true;
                animate
                    .tween(projection.pos, { x, y: nodeY }, {
                        duration: 250,
                        easing: animate.Easing.Cubic.Out,
                    })
                    .then(() => {
                        projection.animating = false;
                    });
            }
            else if (!projection.animating) {
                projection.pos.x = x;
                projection.pos.y = nodeY;
            }

            x += projection.size.w + 20;
            projection.draw(nodeId, nodeId, state, this.stage, {
                x: 0,
                y: 0,
                sx: 1,
                sy: 1,
            });

            const node = state.get("nodes").get(nodeId);
            if (node.has("__meta") && node.get("__meta").toolbox.unlimited) {
                this.stage.internalViews[this.infBg].draw(-1, nodeId, state, this.stage, {
                    x: projection.pos.x + projection.size.w - 33,
                    y: projection.pos.y - 20,
                    sx: 1,
                    sy: 1,
                });
                this.stage.internalViews[this.inf].draw(null, null, state, this.stage, {
                    x: projection.pos.x + projection.size.w - 25,
                    y: projection.pos.y - 5,
                    sx: 1,
                    sy: 1,
                });
            }

            i++;
        }

        this._firstRender = false;
    }
}
