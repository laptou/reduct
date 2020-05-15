export class NotchSet {
    public notches: Notch[];

    public constructor(notches: Notch[]) {
        this.notches = notches;
    }

    public get(idx: number) {
        return this.notches[idx];
    }

    public drawSequence(
        ctx: CanvasRenderingContext2D,
        side: NotchSide,
        x: number,
        y: number,
        len: number
    ) {
        const notches = this.notches
            .filter((n) => n.side === side)
            .sort((a, b) => a.relpos - b.relpos);
        if (side === 'left' || side === 'right') {
            notches.forEach((n) => n.drawVertical(ctx, x, y, len));
        } else {
            notches.forEach((n) => n.drawHorizontal(ctx, x, y, len));
        }
    }
}

export enum NotchSide {
    Top = 'top',
    Left = 'left',
    Bottom = 'bottom',
    Right = 'right'
}

export class Notch {
    public side: NotchSide;

    public relpos: any;

    public shape: any;

    public width: any;

    public depth: any;

    public inner: any;

    public constructor(
        side: NotchSide,
        shape: any,
        width: number,
        depth: number,
        relpos: number,
        inner: boolean
    ) {
        this.side = side;
        this.shape = shape;
        this.width = width;
        this.depth = depth;
        this.inner = inner;
        this.relpos = relpos;
    }

    public get direction() {
        if (this.side === NotchSide.Left || this.side === NotchSide.Bottom) {
            return -1;
        }
        return 1;
    }

    public drawVertical(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        h: number,
        dir?: number
    ) {
        if (!dir) dir = this.direction;
        const { relpos } = this;
        const facing = this.inner ? 1 : -1;
        ctx.lineTo(x, y + dir * (h * relpos - this.width));
        ctx.lineTo(x - facing * dir * this.depth, y + dir * h * relpos);
        ctx.lineTo(x, y + dir * (h * relpos + this.width));
    }

    public drawHorizontal(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        dir?: number
    ) {
        if (!dir) dir = this.direction;
        const { relpos } = this;
        const facing = this.inner ? 1 : -1;
        ctx.lineTo(x + dir * (w * relpos - this.width), y);
        ctx.lineTo(x + dir * (w * relpos), y + facing * dir * this.depth);
        ctx.lineTo(x + dir * (w * relpos + this.width), y);
    }
}

export function parseDescription(description) {
    let relpos = 0.5;
    if (typeof description.relpos !== 'undefined') {
        relpos = description.relpos;
    }
    return new Notch(description.side, description.shape, 10, 10, relpos, description.type === 'inset');
}

export function parseDescriptions(descriptions) {
    return new NotchSet(descriptions.map(parseDescription));
}
