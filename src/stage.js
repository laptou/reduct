import * as action from "./action";
import * as projection from "./projection";

export class Stage {
    constructor(width, height, store, views, semantics) {
        this.store = store;
        this.views = views;
        this.semantics = semantics;

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);
        this.ctx = this.canvas.getContext("2d");

        this.color = "#EEEEEE";

        this._redrawPending = false;
        this._drawFunc = null;

        this.canvas.addEventListener("mousedown", (e) => this._mousedown(e));
        this.canvas.addEventListener("mousemove", (e) => this._mousemove(e));
        this.canvas.addEventListener("mouseup", (e) => this._mouseup(e));

        this._selectedNode = null;
        this._dragged = false;
    }

    get view() {
        return this.canvas;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            // TODO: scale
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top),
        };
    }

    drawImpl() {
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this._redrawPending = false;

        const state = this.store.getState();
        for (const nodeId of state.board) {
            const node = state.nodes[nodeId];
            projection.draw(node, state, this.views, this);
        }
    }

    draw() {
        if (this._redrawPending) return;
        this._redrawPending = true;
        window.requestAnimationFrame(() => {
            this.drawImpl();
        });
    }

    _mousedown(e) {
        const state = this.store.getState();
        const pos = this.getMousePos(e);
        this._selectedNode = null;
        for (const nodeId of state.board) {
            const node = state.nodes[nodeId];
            if (projection.containsPoint(pos, node, state.nodes, this.views, this)) {
                this._selectedNode = nodeId;
                console.log("selected", nodeId, node);
            }
        }
    }

    _mousemove(e) {
        if (e.buttons > 0 && this._selectedNode !== null) {
            const view = this.views[this._selectedNode];
            view.x += e.movementX;
            view.y += e.movementY;
            this.draw();
            this._dragged = true;
        }

        this._hoverNode = null;
        const state = this.store.getState();
        const pos = this.getMousePos(e);
        for (const nodeId of state.board) {
            const node = state.nodes[nodeId];
            if (projection.containsPoint(pos, node, state.nodes, this.views, this)) {
                this._hoverNode = nodeId;
            }
        }
        this.store.dispatch(action.hover(this._hoverNode));
    }

    _mouseup(e) {
        if (!this._dragged && this._selectedNode) {
            const state = this.store.getState();
            this.semantics.reduce(state.nodes, state.nodes[this._selectedNode]).then((res) => {
                if (!res) return;

                const [ result, nodes ] = res;
                let state = this.store.getState();
                const queue = [ this._selectedNode ];
                while (queue.length > 0) {
                    const current = queue.pop();
                    delete this.views[current];
                    for (const subexp of this.semantics.subexpressions(state.nodes[current])) {
                        queue.push(subexp);
                    }
                }

                this.store.dispatch(action.smallStep(this._selectedNode, result, nodes));

                state = this.store.getState();
                for (const node of nodes) {
                    this.views[node.id] = projection.initializeView(node.id, state.nodes, this.views);
                }

                this._selectedNode = null;
            });
        }
        this._dragged = false;
    }
}
