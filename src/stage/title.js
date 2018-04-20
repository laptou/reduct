import * as gfx from "../gfx/core";
import * as animate from "../gfx/animate";
import * as progression from "../game/progression";
import Audio from "../resource/audio";

import Loader from "../loader";

import BaseStage from "./basestage";
import BaseTouchRecord from "./touchrecord";

export default class TitleStage extends BaseStage {
    constructor(startGame, ...args) {
        super(...args);

        this.startGame = startGame;
        this.color = "#594764";
        this.buttonHighlight = null;

        const title = gfx.layout.sticky(
            gfx.layout.ratioSizer(gfx.sprite({
                image: Loader.images["reduct_title"],
                size: { h: 213, w: 899 },
            }), 213 / 899, 0.6),
            "center",
            {}
        );
        title.opacity = 0;
        this.title = this.allocateInternal(title);

        const buttons = [];

        const shapeIds = [
            gfx.shapes.star(), gfx.shapes.triangle(),
            gfx.shapes.rectangle(), gfx.shapes.circle(),
        ].map(view => this.allocate(view));
        const foodIds = [
            Loader.images["food_1"],
            Loader.images["food_2"],
            Loader.images["food_3"],
            Loader.images["food_4"],
        ].map(image => this.allocate(gfx.sprite({
            image,
            size: image.naturalHeight / image.naturalWidth > 1.5 ?
                {
                    w: 25,
                    h: (image.naturalHeight / image.naturalWidth) * 25,
                } :
                {
                    w: 50,
                    h: (image.naturalHeight / image.naturalWidth) * 50,
                },
        })));
        const views = [
            [0, gfx.layout.hbox(
                () => shapeIds,
                {
                    subexpScale: 1.0,
                },
                gfx.baseProjection
            )],
            [1, gfx.layout.hbox(
                () => foodIds,
                {
                    subexpScale: 1.0,
                },
                gfx.baseProjection
            )],
        ];

        for (const [ symbolFadeLevel, view ] of views) {
            const theme = this.allocate(view);
            const label = this.allocate(gfx.text("I like", {
                fontSize: 50,
                font: gfx.text.script,
            }));
            const label2 = this.allocate(gfx.text("!", {
                fontSize: 50,
                font: gfx.text.script,
            }));
            const button = gfx.layout.hbox(
                () => [ label, theme, label2 ],
                {
                    subexpScale: 1.0,
                },
                gfx.baseProjection
            );
            button.onmouseexit = () => {
                this.buttonHighlight = null;
            };
            button.onmouseenter = () => {
                this.buttonHighlight = button;
            };
            button.onclick = () => {
                progression.forceFadeLevel("symbol", symbolFadeLevel);
                this.animateStart();
            };

            buttons.push(this.allocate(button));
        }

        this.buttons = buttons;

        const layout = gfx.layout.sticky(gfx.layout.vbox(() => buttons, {
            subexpScale: 1.0,
        }, gfx.baseProjection), "center", {
            hAlign: 0.0,
        });
        layout.opacity = 0.0;
        this.layout = this.allocate(layout);

        // ** Startup Animations ** //

        animate.tween(this, {
            color: "#FFF",
        }, {
            duration: 1000,
            setAnimatingFlag: false,
            easing: animate.Easing.Color(animate.Easing.Cubic.In, this.color, "#FFF"),
        })
            .then(() => animate.tween(title, {
                opacity: 1.0,
            }, {
                duration: 1000,
                easing: animate.Easing.Cubic.Out,
            }).delay(1000))
            .then(() => animate.tween(title, {
                scale: { x: 0.7, y: 0.7 },
                sticky: { marginY: -180 },
            }, {
                duration: 1000,
                easing: animate.Easing.Cubic.Out,
            }))
            .then(() => animate.tween(layout, {
                opacity: 1.0,
            }, {
                duration: 1000,
                easing: animate.Easing.Cubic.Out,
            }));
    }

    animateStart() {
        Promise.all([
            animate.tween(this.getView(this.title), {
                scale: { x: 0.4, y: 0.4 },
                opacity: 0.5,
                sticky: { marginY: -this.height },
            }, {
                duration: 1500,
                easing: animate.Easing.Cubic.In,
            }),
            animate.tween(this.getView(this.layout), {
                opacity: 0,
            }, {
                duration: 1000,
                easing: animate.Easing.Cubic.In,
            }),
            animate.tween(this, {
                color: "#EEEEEE",
            }, {
                duration: 1000,
                setAnimatingFlag: false,
                easing: animate.Easing.Color(animate.Easing.Cubic.In, this.color, "#EEEEEE"),
            }),
        ]).then(() => this.startGame());
    }

    get touchRecordClass() {
        return TouchRecord;
    }

    drawContents() {
        const state = this.getState();

        this.ctx.save();
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();

        this.drawInternalProjection(state, this.title);
        this.drawProjection(state, this.layout);

        if (this.buttonHighlight !== null) {
            const pos = gfx.absolutePos(this.buttonHighlight);
            const sz = gfx.absoluteSize(this.buttonHighlight);

            this.ctx.save();

            this.ctx.globalAlpha = this.getView(this.layout).opacity;

            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = "#e95888";
            this.ctx.lineCap = "butt";
            this.ctx.lineJoin = "miter";

            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y + sz.h);
            const mx = pos.x + (sz.w / 2);
            const y = pos.y + sz.h;
            this.ctx.bezierCurveTo(
                pos.x + 5, y - 20,
                mx - 25, y - 10,
                mx, y
            );
            this.ctx.bezierCurveTo(
                mx + 25, y + 10,
                (pos.x + sz.w) - 5, y + 20,
                pos.x + sz.w, y
            );
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo((pos.x + sz.w) - ((3 * sz.w) / 50), y - 5);
            this.ctx.lineTo((pos.x + sz.w) - ((5 * sz.w) / 50), y + 25);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo((pos.x + sz.w) - ((7 * sz.w) / 50), y - 5);
            this.ctx.lineTo((pos.x + sz.w) - ((9 * sz.w) / 50), y + 25);
            this.ctx.stroke();

            this.ctx.restore();
        }
    }

    getNodeAtPos(pos, selectedId=null) {
        const offset = this.makeBaseOffset();
        const buttonLayout = this.getView(this.layout);
        if (buttonLayout.containsPoint(pos, offset)) {
            const topLeft = gfx.util.topLeftPos(buttonLayout, offset);
            const subpos = {
                x: pos.x - topLeft.x,
                y: pos.y - topLeft.y,
            };

            for (const id of this.buttons) {
                const button = this.getView(id);
                if (button.containsPoint(subpos, offset)) {
                    return [ id, id ];
                }
            }
        }

        return [ null, null ];
    }

    updateCursor(touchRecord, moved=false) {
        if (touchRecord.hoverNode !== null) {
            this.setCursor("pointer");
        }
        else {
            this.setCursor("default");
        }
    }
}

class TouchRecord extends BaseTouchRecord {
    onstart(...args) {
        super.onstart(...args);

        if (this.topNode) {
            const view = this.stage.getView(this.topNode);
            if (view.onmousedown) {
                view.onmousedown();
            }
        }
    }

    onmove(...args) {
        super.onmove(...args);

        if (this.hoverNode !== this.prevHoverNode) {
            const view = this.stage.getView(this.hoverNode);
            const prevView = this.stage.getView(this.prevHoverNode);

            if (prevView && prevView.onmouseexit) {
                prevView.onmouseexit();
            }

            if (view && view.onmouseenter) {
                view.onmouseenter();
            }
        }
    }

    onend(...args) {
        super.onend(...args);

        if (this.topNode) {
            const view = this.stage.getView(this.topNode);
            if (view.onclick) {
                view.onclick();
            }
        }
    }
}