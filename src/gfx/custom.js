/**
 * Custom views for specific expressions.
 */

import * as gfx from "./core";
import * as primitive from "./primitive";
import * as util from "./util";

export function argumentBar() {
    const projection = gfx.baseProjection();


    projection.prepare = function(id, exprId, state, stage) {
        this.count = 0;
        this.size = { w: 0, h: 50 };

        const define = state.getIn([ "nodes", exprId ]);
        let body = state.getIn([ "nodes", define.get("body") ]);

        while (body.get("type") === "lambda") {
            this.count += 1;
            this.size.w += 50;
            body = state.getIn([ "nodes", body.get("body") ]);
        }

        this.size.w = Math.max(0, this.size.w - 10);
    };
    projection.draw = function(id, exprId, state, stage, offset) {
        const { ctx } = stage;
        ctx.save();

        const [ sx, sy ] = util.absoluteScale(this, offset);
        const { x, y } = util.topLeftPos(this, offset);

        util.setOpacity(ctx, this.opacity, offset);

        const w = sx * 40;
        const h = sy * (this.size.h - 10);

        const dy = sy * 5;
        for (let i = 0; i < this.count; i++) {
            const dx = sx * (50 * i);
            ctx.fillStyle = "#000";
            primitive.roundRect(
                ctx,
                x + dx, y + (dy - 3), w, h,
                sx * 22,
                true,
                false,
                1.0,
                null
            );

            ctx.fillStyle = "#555";
            primitive.roundRect(
                ctx,
                x + dx, y + dy, w, h,
                sx * 22,
                true,
                false,
                1.0,
                null
            );
        }

        ctx.restore();
    };
    return projection;
}
