/**
 * Handy built-in effects.
 */

import Loader from '../loader';
import Audio from '../resource/audio';
import * as gfx from './core';
import * as animate from './animate';
import * as primitive from './primitive';

/**
 * An explosion effect.
 */
export function splosion(stage, pos, options = {}) {
    options = {
        color: 'gold',
        numOfParticles: 20,
        explosionRadius: 100,
        duration: 600,
        angle: (_idx) => Math.random() * Math.PI * 2,
        ...options
    };
    const parts = [];
    const tweens = [];

    const minRadius = 1;
    const maxRadius = 12;

    for (let i = 0; i < options.numOfParticles; i++) {
        const record = {
            x: pos.x,
            y: pos.y,
            r: Math.floor(minRadius + ((maxRadius - minRadius) * Math.random()))
        };
        parts.push(record);

        const theta = options.angle(i);
        const rad = options.explosionRadius * ((Math.random() / 2.0) + 0.5);

        tweens.push(animate.tween(record, {
            x: pos.x + (rad * Math.cos(theta)),
            y: pos.y + (rad * Math.sin(theta)),
            r: 0
        }, {
            duration: options.duration,
            easing: animate.Easing.Time((t) => t ** 0.5)
        }));
    }

    const id = stage.addEffect({
        prepare: () => {},
        draw: () => {
            const { ctx } = stage;
            if (typeof options.color === 'string') ctx.fillStyle = options.color;
            ctx.save();
            let i = 0;
            for (const record of parts) {
                ctx.beginPath();
                if (typeof options.color === 'function') ctx.fillStyle = options.color(i);
                ctx.arc(
                    record.x + record.r,
                    record.y + record.r,
                    record.r,
                    0, 2 * Math.PI
                );
                ctx.fill();
                i += 1;
            }
            ctx.restore();
        },
        containsPoint: () => false
    });

    return Promise.all(tweens).then(() => {
        stage.removeEffect(id);
    });
}

export function blink(stage, projection, opts) {
    const options = {
        times: 1,
        color: '#F00',
        speed: 600,
        lineWidth: 3,
        background: false,
        field: 'stroke',
        ...opts
    };

    if (!projection.color) projection.color = 'black';

    if (options.background) {
        if (!projection.__origColor) {
            projection.__origColor = projection.color;
        }

        const bgColor = typeof options.background === 'string' ? options.background : options.color;

        animate.tween(projection, { color: bgColor }, {
            reverse: true,
            repeat: options.times * 2,
            duration: options.speed,
            easing: animate.Easing.Color(animate.Easing.Linear, projection.color, bgColor)
        }).then(() => {
            projection.color = projection.__origColor;
        });
    }

    // TODO: refactor this into a helper

    let updatedStroke = projection[options.field];
    const tempStroke = { color: options.color, lineWidth: 0 };
    const descriptor = Object.getOwnPropertyDescriptor(projection, options.field);
    // Don't blink if fx already in progress
    if (!descriptor || !descriptor.get) {
        Object.defineProperty(projection, options.field, {
            configurable: true,
            get() {
                return tempStroke;
            },
            set(newValue) {
                updatedStroke = newValue;
            }
        });
        return animate.tween(tempStroke, { lineWidth: options.lineWidth }, {
            reverse: true,
            repeat: options.times * 2,
            duration: options.speed
        }).then(() => {
            delete projection[options.field];
            projection[options.field] = updatedStroke;
            stage.drawImpl();
        });
    }
    return Promise.resolve();
}

export function shatter(stage, projection, options) {
    const { onFullComplete } = options;

    const size = gfx.absoluteSize(projection);
    const pos = gfx.absolutePos(projection);
    const status = {
        x: pos.x,
        y: pos.y,
        w: size.w,
        h: size.h,
        a: 0
    };

    const { ctx } = stage;
    let primitive = (offset) => {
        gfx.primitive.roundRect(
            ctx,
            status.x, status.y + offset,
            status.w, status.h,
            projection.radius,
            true,
            true
        );
    };
    if (projection.baseType === 'hexaRect') {
        primitive = (offset) => {
            gfx.primitive.hexaRect(
                ctx,
                status.x, status.y + offset,
                status.w, status.h,
                Math.min(25, status.w / 2), status.h / 2,
                true,
                true
            );
        };
    }

    const id = stage.addEffect({
        prepare: () => {},
        draw: () => {
            ctx.save();
            ctx.globalAlpha = status.a;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.fillStyle = 'black';
            primitive(4);
            ctx.fillStyle = 'white';
            primitive(0);
            ctx.restore();
        }
    });

    return new Promise((resolve, _reject) => {
        animate.chain(
            status,
            [
                { a: 1 },
                {
                    duration: options.introDuration || 500,
                    easing: animate.Easing.Cubic.In,
                    callback: () => {
                        resolve();
                    }
                }],
            [
                {
                    a: 0,
                    w: 1.2 * size.w,
                    h: 1.4 * size.h,
                    x: pos.x - (0.1 * size.w),
                    y: pos.y - (0.2 * size.h)
                },
                {
                    duration: options.outroDuration || 800,
                    easing: animate.Easing.Cubic.Out
                }
            ]
        ).then(() => {
            stage.removeEffect(id);
            if (onFullComplete) {
                onFullComplete();
            }
        });
    });
}

export function poof(stage, projection) {
    const pos = gfx.centerPos(projection);
    const status = { t: 0.0 };
    const images = ['poof0', 'poof1', 'poof2', 'poof3', 'poof4']
        .map((key) => Loader.images[key]);

    const { ctx } = stage;
    const id = stage.addEffect({
        prepare: () => {},
        draw: () => {
            ctx.save();
            const idx = Math.min(Math.floor(status.t * images.length), images.length - 1);
            images[idx].draw(
                ctx,
                pos.x - 45, pos.y - 45,
                90, 90
            );
            ctx.restore();
        }
    });

    return animate.tween(status, { t: 1.0 }, {
        duration: 500
    }).then(() => {
        stage.removeEffect(id);
    });
}

export function error(stage, projection) {
    Audio.play('negative_2');
    return blink(stage, projection, {
        times: 3,
        speed: 350,
        color: '#F00',
        lineWidth: 5,
        background: 'orange'
    });
}

export function emerge(stage, state, bodyPos, bodySize, resultIds) {
    const spacing = 10;
    let emergeDistance = 100;
    let totalHeight = 0;
    let maxWidth = 50;
    let maxHeight = 50;

    for (const resultId of resultIds) {
        const resultView = stage.views[resultId];
        resultView.prepare(resultId, resultId, state, stage);
        const sz = gfx.absoluteSize(resultView);
        totalHeight += sz.h + spacing;
        maxWidth = Math.max(sz.w, maxWidth);
        maxHeight = Math.max(sz.h, maxHeight);
    }
    totalHeight -= spacing;

    const ap = bodyPos;
    const as = bodySize;
    let y = (ap.y + (as.h / 2));

    // Compute using bounding box of the end position
    const { x: safeX, y: safeY } = stage.findSafePosition(
        (ap.x + (as.w / 2)) - (maxWidth / 2),
        y - emergeDistance,
        maxWidth,
        totalHeight
    );

    emergeDistance = y - (maxHeight / 2) - safeY;

    const tweens = [];
    for (const resultId of resultIds) {
        const resultView = stage.views[resultId];
        const sz = gfx.absoluteSize(resultView);
        resultView.pos.x = safeX + (maxWidth / 2);
        resultView.pos.y = y;
        resultView.anchor.x = 0.5;
        resultView.anchor.y = 0.5;
        resultView.scale.x = 0.0;
        resultView.scale.y = 0.0;

        tweens.push(animate.tween(resultView, {
            pos: {
                y: resultView.pos.y - emergeDistance
            },
            scale: {
                x: 1,
                y: 1
            }
        }, {
            duration: 1000,
            easing: animate.Easing.Cubic.Out
        }));
        y += sz.h + spacing;
    }

    return Promise.all(tweens);
}

export function expandingShape(stage, projection, options = {}) {
    const centerPos = gfx.centerPos(projection);
    const state = {
        pos: centerPos,
        size: gfx.absoluteSize(projection),
        color: options.color || 'white',
        scale: { x: 1, y: 1 },
        radius: projection.radius || 0,
        opacity: 1
    };

    const { ctx } = stage;
    const id = stage.addEffect({
        prepare: () => {},
        draw: () => {
            const w = state.size.w * state.scale.x;
            const h = state.size.h * state.scale.y;
            primitive.setStroke(ctx, { lineWidth: 2, color: state.color });
            primitive.roundRect(
                ctx,
                state.pos.x - (w / 2), state.pos.y - (h / 2),
                w, h,
                state.scale.x * state.radius,
                false, true, state.opacity
            );
        }
    });

    return animate.tween(state, {
        scale: {
            x: 4,
            y: 4
        },
        opacity: 0
    }, {
        duration: options.duration || 500
    }).then(() => {
        stage.removeEffect(id);
    });
}

/**
 * Render a node that isn't currently part of the board, for as long
 * as a particular tween is running.
 */
export function keepAlive(stage, id, promise, under = false) {
    const fxId = stage.addEffect({
        under,
        prepare: () => {
            stage.getView(id).prepare(id, id, stage.getState(), stage);
        },
        draw: () => {
            stage.getView(id).draw(id, id, stage.getState(), stage, stage.makeBaseOffset());
        }
    });

    return promise.then((args) => {
        stage.removeEffect(fxId);
        return args;
    });
}
