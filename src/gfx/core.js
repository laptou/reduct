/**
 * @module gfx/core
 */

import * as image from './image';
import * as notch from './notch';
import * as primitive from './primitive';
import * as util from './util';

import * as custom from './custom';
import * as layout from './layout';
import * as shapes from './shapes';
import * as ui from './ui';
import * as viewport from './viewport';

export { image, util };

let DEBUG = false;
const DEBUG_COLORS = {
    'hbox': 'blue',
    'vbox': 'blue',
    'text': 'green',
    'custom/argumentBar': 'purple'
};

document.body.addEventListener('keyup', (e) => {
    if (e.key === 'F2') DEBUG = !DEBUG;
});

/**
 * The base view type.
 *
 * Note that you do *not* use ``new`` with views. Views are just
 * functions that construct objects. They may not necessarily
 * construct a new object; some views are modifiers for other views.
 *
 * @class
 * @alias gfx.baseProjection
 */
export function baseProjection(options) {
    const projection = { /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.pos
         * @instance
         */
        pos: { x: 0, y: 0 },
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.anchor
         * @instance
         */
        anchor: { x: 0, y: 0 },
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.scale
         * @instance
         */
        scale: { x: 1, y: 1 },
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.size
         * @instance
         */
        size: { w: 0, h: 0 },
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.opacity
         * @instance
         */
        opacity: 1.0,
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.backgroundOpacity
         * @instance
         */
        backgroundOpacity: 1.0,
        /**
         * @member
         * @memberof! gfx.baseProjection
         * @alias gfx.baseProjection.offset
         * @instance
         */
        offset: { x: 0, y: 0 },
        ...options
    };

    if (options && options.notches) {
        projection.notches = notch.parseDescriptions(options.notches);
    }

    /**
     * Perform any layout or update any state for this view. Called
     * before drawing.
     *
     * @param {Number} id - The ID of this view.
     * @param {Number} exprId - The ID of the associated expression,
     * if any.
     * @param state - The current Redux/Immutable.js state.
     * @param stage - The containing stage.
     *
     * @alias gfx.baseProjection.prepare
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.prepare = function(id, exprId, state, stage) {};
    /**
     * Actually draw this view.
     *
     * @param {Number} id - The ID of this view.
     * @param {Number} exprId - The ID of the associated expression,
     * if any.
     * @param state - The current Redux/Immutable.js state.
     * @param stage - The containing stage.
     * @param offset - An object containing a position (``x``, ``y``)
     * offset to apply, a scale (``sx``, ``sy``) to apply, and the
     * current cumulative opacity (``opacity``) value.
     *
     * @alias gfx.baseProjection.draw
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.draw = function(id, exprId, state, stage, offset) {};

    /**
     * Get the children of this view, based on the expression ID and
     * current state.
     *
     * @return An iterable of ``[ childViewId, childExprId ]`` tuples.
     *
     * @alias gfx.baseProjection.children
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.children = function(exprId, state) {
        return [];
    };

    /**
     * @alias gfx.baseProjection.containsPoint
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.containsPoint = function(pos, offset) {
        const { x, y } = util.topLeftPos(this, offset);
        return pos.x >= x
            && pos.y >= y
            && pos.x <= x + (this.size.w * offset.sx * this.scale.x)
            && pos.y <= y + (this.size.h * offset.sy * this.scale.y);
    };

    /**
     * @alias gfx.baseProjection.notchOffset
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.notchOffset = function(id, exprId, notchId) {};
    /**
     * @alias gfx.baseProjection.notchPos
     * @memberof! gfx.baseProjection
     * @instance
     */
    projection.notchPos = function(id, exprId, notchId) {
        const pos = util.topLeftPos(this, {
            x: 0,
            y: 0,
            sx: 1,
            sy: 1
        }); // Assume we are a top level expression
        const offset = this.notchOffset(id, exprId, notchId);
        return {
            x: pos.x + offset.x,
            y: pos.y + offset.y
        };
    };

    return projection;
}

export function notchProjection(options) {
    const projection = baseProjection(options);
    projection.type = 'notch';

    projection.prepare = function(id, exprId, state, stage) {
        if (this.notches) {
            const node = state.getIn(['nodes', exprId]);
            // TODO: don't hardcode this
            if (node.has('notch0')) {
                const childId = node.get('notch0');
                stage.views[childId].prepare(childId, childId, state, stage);
            }
        }
    };
    projection.draw = function(id, exprId, state, stage, offset) {
        if (this.notches) {
            const { x, y } = util.topLeftPos(this, offset);
            const { ctx } = stage;
            const draw = (yOffset) => {
                this.size.h = 160;
                ctx.beginPath();
                ctx.moveTo(x, y + yOffset);
                this.notches.drawSequence(ctx, 'right', x, y + yOffset, this.size.h);
                ctx.lineTo(x, y + this.size.h + yOffset);
                ctx.closePath();
                ctx.fill();
                if (this.highlighted || this.stroke) ctx.stroke();
            };
            ctx.save();
            if (this.shadow) ctx.fillStyle = this.shadowColor;
            draw(this.shadowOffset);
            if (this.highlighted) {
                primitive.setStroke(ctx, {
                    lineWidth: 4,
                    color: 'magenta'
                });
            } else if (this.stroke) {
                primitive.setStroke(ctx, this);
            } else {
                primitive.setStroke(ctx, null);
            }
            if (this.color) ctx.fillStyle = this.color;
            draw(0);
            ctx.restore();

            const node = state.getIn(['nodes', exprId]);
            // TODO: don't hardcode this
            if (node.has('notch0')) {
                const childId = node.get('notch0');
                const delta = stage.views[childId].notchOffset(childId, childId, 0);
                stage.views[childId].anchor.x = 0.0;
                stage.views[childId].anchor.y = 0.0;
                stage.views[childId].pos.x = this.pos.x - (delta.x / 2);
                stage.views[childId].pos.y = (this.pos.y + this.notchOffset(id, exprId, 0).y) - delta.y;

                stage.views[childId].draw(childId, childId, state, stage, offset);
            }
        }
    };
    projection.notchOffset = function(id, exprId, notch) {
        return { x: 0, y: this.size.h / 2 };
    };
    return projection;
}

export function debugDraw(ctx, projection, offset) {
    if (DEBUG) {
        const [sx, sy] = util.absoluteScale(projection, offset);
        const { x, y } = util.topLeftPos(projection, offset);
        ctx.save();
        ctx.strokeStyle = DEBUG_COLORS[projection.type] || 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y,
            projection.size.w * sx,
            projection.size.h * sy);
        ctx.restore();
    }
}

export function hoverOutline(id, projection, stage, offset) {
    if (stage.isHovered(id)) {
        const { x, y } = util.topLeftPos(projection, offset);
        primitive.setStroke(stage.ctx, {
            lineWidth: 2,
            color: projection.highlightColor || 'yellow'
        });

        primitive.roundRect(
            stage.ctx,
            x, y,
            offset.sx * projection.scale.x * projection.size.w,
            offset.sy * projection.scale.y * projection.size.h,
            projection.scale.x * offset.sx * (projection.radius || 15),
            false,
            true,
            projection.stroke ? projection.stroke.opacity : null
        );
    }
}

/**
 * Given projection IDs, returns a function that always returns those
 * IDs.
 *
 * Useful as the ``childrenFunc`` argument to a view when your
 * children are static.
 *
 * @param {...*} projections - The view IDs. (This is a variadic
 * function.)
 *
 * @alias gfx.constant
 */
export function constant(...projections) {
    return () => projections;
}

/**
 * Return the L2-norm distance between two views or point-like objects
 * (i.e. the object should either have an ``x`` and ``y`` field, or
 * have a ``pos`` field).
 *
 * @alias gfx.distance
 */
export function distance(proj1, proj2) {
    const p1 = proj1.pos || proj1;
    const p2 = proj2.pos || proj2;
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Return the canvas coordinates of the top left of this view,
 * accounting for anchor (not the coordinates relative to its parent).
 *
 * @alias gfx.absolutePos
 */
export function absolutePos(projection) {
    let { x, y } = projection.pos;
    x -= projection.anchor.x * projection.size.w * projection.scale.x;
    y -= projection.anchor.y * projection.size.h * projection.scale.y;

    while (projection.parent) {
        projection = projection.parent;
        x *= projection.scale.x;
        y *= projection.scale.y;
        x += projection.pos.x - (projection.anchor.x * projection.size.w * projection.scale.x);
        y += projection.pos.y - (projection.anchor.y * projection.size.h * projection.scale.y);
    }
    return { x, y };
}

/**
 * Return the canvas size of this view (not the size relative to its
 * parent).
 *
 * @alias gfx.absoluteSize
 */
export function absoluteSize(projection) {
    let { w, h } = projection.size;
    w *= projection.scale.x;
    h *= projection.scale.y;
    while (projection.parent) {
        projection = projection.parent;
        w *= projection.scale.x;
        h *= projection.scale.y;
    }
    return { w, h };
}

/**
 * Return the canvas coordinates of the center of this view
 * (accounting for anchor).
 *
 * @alias gfx.centerPos
 */
export function centerPos(projection) {
    const { x, y } = absolutePos(projection);
    const { w, h } = absoluteSize(projection);
    return {
        x: x + (w / 2),
        y: y + (h / 2)
    };
}

export function baseShape(name, defaults, draw, baseShapeOptions = {}) {
    return function(options) {
        const projection = Object.assign(baseProjection(), defaults, options);
        projection.size.w = projection.size.h = 40;
        projection.type = name;

        if (options.notches) {
            projection.notches = notch.parseDescriptions(options.notches);
        }

        projection.prepare = function(id, exprId, state, stage) {};

        if (baseShapeOptions.prepare) {
            projection.prepare = function(...args) {
                baseShapeOptions.prepare(...args);
            };
        }

        projection.draw = function(id, exprId, state, stage, offset) {
            const { ctx } = stage;
            ctx.save();

            const [sx, sy] = util.absoluteScale(this, offset);
            const { x, y } = util.topLeftPos(this, offset);

            util.setOpacity(ctx, this.opacity, offset, this.backgroundOpacity);

            const node = state.getIn(['nodes', exprId]);

            if ((this.shadow !== false)
                && (this.shadow || (node && (!node.get('parent') || !node.get('locked'))))) {
                ctx.fillStyle = this.shadowColor;
                draw(ctx, this,
                    x, y + this.shadowOffset * offset.sy,
                    offset.sx * this.scale.x * this.size.w,
                    offset.sy * this.scale.y * this.size.h,
                    sx, sy,
                    this.stroke,
                    this.notches);
            }

            if (this.color) ctx.fillStyle = this.color;

            let shouldStroke = false;
            if (this.stroke || this.outerStroke) {
                shouldStroke = true;
                primitive.setStroke(ctx, this.stroke || this.outerStroke);
            } else if (stage.isHovered(id) && (this.highlight !== false)) {
                primitive.setStroke(ctx, {
                    lineWidth: 2,
                    color: this.highlightColor || 'yellow'
                });
                shouldStroke = true;
            } else if (!!(node && node.get('parent') && node.get('locked'))
                     && this.strokeWhenChild) {
                // Stroke if we have a parent to make it clearer.
                primitive.setStroke(ctx, {
                    lineWidth: 1,
                    color: 'gray'
                });
                shouldStroke = true;
            } else {
                primitive.setStroke(ctx, null);
            }

            if (node && !node.get('parent') && stage.semantics.kind(state, node) === 'expression') {
                if (node.get('complete')) {
                    ctx.shadowColor = 'DeepPink';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetY = 0;
                }
            }


            draw(ctx, this,
                x, y,
                offset.sx * this.scale.x * this.size.w,
                offset.sy * this.scale.y * this.size.h,
                sx, sy,
                this.stroke || shouldStroke,
                this.notches);
            debugDraw(ctx, this, offset);

            ctx.restore();
        };

        if (baseShapeOptions.notchOffset) {
            projection.notchOffset = baseShapeOptions.notchOffset;
        }

        return projection;
    };
}

/**
 * @class
 * @alias gfx.rect
 */
export const rect = baseShape('roundedRect', {
    color: 'lightgray',
    radius: 20,
    shadowColor: '#000',
    shadowOffset: 4,
    strokeWhenChild: true
}, (ctx, projection, x, y, w, h, sx, sy, shouldStroke, notches) => {
    ctx.fillRect(x, y, w, h);
    if (shouldStroke) {
        // TODO: stroke opacity, etc
        ctx.strokeRect(x, y, w, h);
    }
    // TODO: notches
});

/**
 * @class
 * @alias gfx.roundedRect
 */
export const roundedRect = baseShape('roundedRect', {
    color: 'lightgray',
    radius: 18,
    shadowColor: '#000',
    shadowOffset: 4,
    strokeWhenChild: true // Draw border when child of another expression
}, (ctx, projection, x, y, w, h, sx, sy, shouldStroke, notches) => {
    primitive.roundRect(
        ctx,
        x, y, w, h,
        sx * projection.radius,
        !!projection.color,
        shouldStroke,
        projection.stroke ? projection.stroke.opacity : null,
        notches
    );
}, {
    notchOffset(id, exprId, notchIdx) {
        const notch = this.notches.get(notchIdx);
        switch (notch.side) {
        case 'left':
            return {
                x: 0,
                y: this.radius + ((this.size.h - this.radius) * (1 - notch.relpos) * this.scale.y)
            };
        case 'right':
            return {
                x: (this.size.w * this.scale.x),
                y: ((this.radius + ((this.size.h - (this.radius * 2)) * notch.relpos)) * this.scale.y)
            };
        case 'top':
            return {
                x: this.radius + ((this.size.w - (this.radius * 2)) * notch.relpos),
                y: 0
            };
        case 'bottom':
            return {
                x: this.radius + ((this.size.w - (this.radius * 2)) * (1 - notch.relpos)),
                y: this.size.h
            };
        default:
            throw `roundedRect#notchOffset: unrecognized side ${notch.side}`;
        }
    }
});

/**
 * @class
 * @alias gfx.hexaRect
 */
export const hexaRect = baseShape('hexaRect', {
    color: 'lightgray',
    radius: 20,
    shadowColor: '#000',
    shadowOffset: 4,
    strokeWhenChild: true // Draw border when child of another expression
}, (ctx, projection, x, y, w, h, sx, sy, shouldStroke) => {
    primitive.hexaRect(
        ctx,
        x, y, w, h, Math.min(25, w / 2), h / 2,
        !!projection.color,
        shouldStroke,
        projection.stroke ? projection.stroke.opacity : null
    );
});

/**
 * Create a projection that renders based on an expression field or function.
 *
 * Note that all projections must have compatible fields.
 *
 * @class
 * @alias gfx.dynamic
 */
export function dynamic(mapping, keyFunc, options) {
    let projection = {};
    for (const childProjection of Object.values(mapping)) {
        projection = Object.assign(projection, childProjection);
    }
    projection.type = 'dynamic';

    if (typeof keyFunc === 'string') {
        const field = keyFunc;
        keyFunc = function(state, exprId) {
            const expr = state.getIn(['nodes', exprId]);
            return expr.get(field);
        };
    }

    projection.prepare = function(id, exprId, state, stage) {
        const newKey = keyFunc(state, exprId);
        if (options.onKeyChange && this.dynamicKey && newKey !== this.dynamicKey) {
            this.dynamicKey = newKey;
            options.onKeyChange(this, id, exprId, state, stage);
        }
        this.dynamicKey = newKey;

        let proj = mapping.__default__;
        if (typeof mapping[this.dynamicKey] !== 'undefined') {
            proj = mapping[this.dynamicKey];
        }
        this.children = proj.children;

        for (const fieldName of options.resetFields || []) {
            this[fieldName] = proj[fieldName];
        }
        proj.prepare.call(this, id, exprId, state, stage);
    };

    projection.draw = function(id, exprId, state, stage, offset) {
        if (typeof mapping[this.dynamicKey] !== 'undefined') {
            this.children = mapping[this.dynamicKey].children;
            mapping[this.dynamicKey].draw.call(this, id, exprId, state, stage, offset);
        } else {
            this.children = mapping.__default__.children;
            mapping.__default__.draw.call(this, id, exprId, state, stage, offset);
        }
    };

    return projection;
}

/**
 * Create a projection that changes values based on an expression field or function.
 *
 * @class
 * @alias gfx.dynamicProperty
 */
export function dynamicProperty(projection, keyFunc, mappings) {
    if (typeof keyFunc === 'string') {
        const field = keyFunc;
        keyFunc = function(state, exprId) {
            const expr = state.getIn(['nodes', exprId]);
            return expr.get(field);
        };
    }

    const origPrepare = projection.prepare;
    let lastKey = 'default';
    let lastTween = null;

    projection.prepare = function(id, exprId, state, stage) {
        const fieldVal = keyFunc(state, exprId);
        if (fieldVal !== lastKey) {
            lastKey = fieldVal;

            const props = mappings[fieldVal];
            for (const [prop, val] of Object.entries(props)) {
                if (typeof val === 'function') {
                    if (lastTween) lastTween.completed();
                    lastTween = val(this);
                } else {
                    this[prop] = val;
                }
            }
        }

        origPrepare.call(this, id, exprId, state, stage);
    };

    return projection;
}

export { default as text } from './text';

export { default as decal } from './decal';
export * from './sprite';
export {
    custom, layout, primitive, shapes, ui, viewport
};
