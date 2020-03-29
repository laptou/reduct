
/**
 * THANKS TO Juan Mendes @ SO: http://stackoverflow.com/a/3368118
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {{ tl?: number, tr?: number, bl?: number, br?: number } | number} [radius = 5]
 * The corner radius; It can also be an object to specify different radii for corners
 * @param {boolean} [fill = false] Whether to fill the rectangle.
 * @param {boolean} [stroke = true] Whether to stroke the rectangle.
 * @param {number} [strokeOpacity = 1] The opacity of the stroke.
 * @param {*} [notches]
 */
export function roundRect(
    ctx, x, y, width, height,
    radius = 5, fill = false,
    stroke = true, strokeOpacity = 1,
    notches = null,
) {
    if (typeof radius === "number") {
        radius = {
            tl: radius,
            tr: radius,
            br: radius,
            bl: radius,
        };
    }
    else {
        radius = {
            tl: 5, tr: 5, br: 5, bl: 5, ...radius,
        };
    }

    ctx.beginPath();
    if (!notches) {
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    }
    else {
        ctx.moveTo(x + radius.tl, y);
        // Top
        notches.drawSequence(ctx, "top", x + radius.tl, y, width - radius.tr);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        // Right
        notches.drawSequence(ctx, "right", x + width, y + radius.tr, (height - radius.br - radius.tr));
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        // Bottom
        notches.drawSequence(ctx, "bottom", x + width, y, (width - radius.bl));
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        // Left
        notches.drawSequence(ctx, "left", x, y + height, (height - radius.tl));
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    }
    ctx.closePath();
    if (fill) ctx.fill();
    // Don't shadow a stroke
    ctx.shadowColor = "rgba(0,0,0,0)";
    if (stroke) strokeWithOpacity(ctx, strokeOpacity);
}

/** Thanks to markE @ SO: http://stackoverflow.com/a/25840319 */
export function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fill, stroke, strokeOpacity) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    if (stroke) {
        strokeWithOpacity(ctx, strokeOpacity);
    }
    if (fill) {
        ctx.fill();
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number?} opacity
 */
export function strokeWithOpacity(ctx, opacity) {
    if (typeof opacity === "undefined" || opacity >= 1.0) ctx.stroke();
    else {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * opacity;
        ctx.stroke();
        ctx.globalAlpha = a;
    }
}

export function hexaRect(ctx, x, y, width, height, w2, h2, fill, stroke, strokeOpacity) {
    ctx.beginPath();
    ctx.moveTo(x + w2, y);
    ctx.lineTo(x + width - w2, y);
    ctx.lineTo(x + width, y + h2);
    ctx.lineTo(x + width - w2, y + height);
    ctx.lineTo(x + w2, y + height);
    ctx.lineTo(x, y + h2);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) strokeWithOpacity(ctx, strokeOpacity);
}

export function setStroke(ctx, stroke) {
    if (!stroke) {
        ctx.strokeStyle = null;
        return;
    }

    stroke = stroke.stroke || stroke;

    ctx.lineWidth = stroke.lineWidth;
    ctx.strokeStyle = stroke.color;
    if (stroke.lineDash) {
        ctx.setLineDash(stroke.lineDash);
    }
    else {
        ctx.setLineDash([]);
    }

    ctx.lineDashOffset = stroke.lineDashOffset || 0;
}
