import * as gfx from "../gfx/core";
import * as animate from "../gfx/animate";
import * as progression from "../game/progression";
import Loader from "../loader";
import * as action from "../reducer/action";
import { nextId } from "../reducer/reducer";
import * as immutable from "immutable";
export default class SyntaxJournal {
    constructor(stage) {
        this.stage = stage;

        const syntaxJournal = gfx.layout.sticky(gfx.ui.imageButton({
            normal: Loader.images["journal-default"],
            hover: Loader.images["journal-hover"],
            active: Loader.images["journal-mousedown"],
        }, {
            click: () => this.stage.syntaxJournal.toggle(),
        }), "bottom", {
            align: "right",
        });
        syntaxJournal.size = { w: 79, h: 78 };
        this.button = stage.allocateInternal(syntaxJournal);

        this.overlay = stage.allocateInternal(gfx.layout.expand(gfx.rect({
            color: "#000",
            opacity: 0.7,
        }), {
            horizontal: true,
            vertical: true,
        }));

        this.background = stage.allocateInternal(gfx.layout.sticky(gfx.sprite({
            image: Loader.images["journal-bg"],
            size: { w: 558, h: 534 },
        }), "center"));

        this.next = stage.allocateInternal(gfx.layout.sticky(gfx.ui.imageButton({
            normal: Loader.images["journal-default"],
            hover: Loader.images["journal-hover"],
            active: Loader.images["journal-mousedown"],
        }, {
            click: () => console.log("letsgo"),
        }), "center", {
            marginX: 270,
        }));

        /*this.if_dog = stage.allocate(gfx.layout.sticky(gfx.ui.imageButton({
          normal: Loader.images["animal_dog"],
          hover: Loader.images["animal_ocra"],
          active: Loader.images["animal_bear"],
        }, {
           click: () => console.log("Yay"),
        }), "center", {
          marginX: 0,
        }));*/

        this.prev = stage.allocateInternal(gfx.layout.sticky(gfx.ui.imageButton({
            normal: Loader.images["btn-back-default"],
            hover: Loader.images["btn-back-hover"],
            active: Loader.images["btn-back-down"],
        }, {
            click: () => this.stage.syntaxJournal.showBox(),
        }), "center", {
            marginX: -250,
        }));

        this.state = "closed";

        this.syntaxes = {};
        this.currentSyntax = 5;
    }

    getNodeAtPos(state, pos) {
        if (this.state === "closed") {
            const journal = this.stage.internalViews[this.button];
            if (journal.containsPoint(pos, { x: 0, y: 0, sx: 1, sy: 1 })) {
                return [ this.button, this.button ];
            }
        }
        else {
            const prev = this.stage.getView(this.prev);
            const next = this.stage.getView(this.next);
            if (this.showBack && prev.containsPoint(pos, { x: 0, y: 0, sx: 1, sy: 1 })) {
                return [ this.prev, this.prev ];
            }
            else if (this.showForward && next.containsPoint(pos, { x: 0, y: 0, sx: 1, sy: 1 })) {
                return [ this.next, this.next ];
            }
        }
        return [ null, null ];
    }

    drawBase(state) {
        this.stage.internalViews[this.button].prepare(null, null, state, this.stage);
        this.stage.internalViews[this.button].draw(null, null, state, this.stage, {
            x: 0,
            y: 0,
            sx: 1,
            sy: 1,
        });
    }

    get showBack() {
        return this.currentSyntax > 0;
    }

    get showForward() {
        return this.currentSyntax < Object.keys(this.syntaxes).length - 1;
    }

    drawImpl(state) {
        if (this.isOpen) {
            const bg = this.stage.getView(this.background);
            const offset = {
                x: 0,
                y: 0,
                sx: 1,
                sy: 1,
                opacity: bg.opacity,
            };

            this.stage.drawInternalProjection(state, this.overlay);
            this.stage.drawInternalProjection(state, this.background);
            if (this.showBack) {
                this.stage.drawInternalProjection(state, this.prev, null, offset);
            }
            if (this.showForward) {
                this.stage.drawInternalProjection(state, this.next, null, offset);
            }

            let y = bg.pos.y + 200;
            let x = this.stage.width / 2;

          /* for (const nodeId of state.get("toolbox")) {
             const state = this.stage.getState();
             const node = state.getIn([ "nodes", nodeId ]);
             if (node.has("__meta") && node.get("__meta").toolbox.unlimited) {
               const projection = this.stage.getView(nodeId);
               projection.pos.x = this.stage.width / 2;
               projection.pos.y = y;
               projection.scale.x = 1;
               projection.scale.y = 1;
               projection.anchor = { x: 0, y: 0.5 };
               animate
                   .tween(projection, {
                       pos: { x },
                       scale: { x: 1, y: 1 },
                   }, {
                       easing: animate.Easing.Cubic.Out,
                       duration: 400,
                   })
                   .delay(200 * Math.log(2 + 2));

               projection.prepare(nodeId, nodeId, state, this.stage);
               projection.draw(nodeId, nodeId, state, this.stage, this.stage.makeBaseOffset());
             }
         }*/

            const { ctx } = this.stage;
            ctx.save();
            ctx.globalCompositeOperation = "multiply";

            this.project();



            const syntax = progression.getLearnedSyntaxes()[this.currentSyntax];

            if (syntax) {
                const view = this.stage.getView(this.syntaxes[syntax]);
                view.pos.x = this.stage.width / 2;
                view.pos.y = y;
                y += view.size.h + 10;
                this.stage.drawProjection(state, this.syntaxes[syntax], offset);
            }



            ctx.restore();
        }
    }

    get isOpen() {
        return this.state === "open";
    }

    open() {
        this.state = "open";

        const overlay = this.stage.getView(this.overlay);
        const bg = this.stage.getView(this.background);
        overlay.opacity = 0;
        bg.opacity = 0;

        animate.tween(overlay, { opacity: 0.7 }, {
            duration: 500,
            easing: animate.Easing.Cubic.In,
        });
        animate.tween(bg, { opacity: 1.0 }, {
            duration: 500,
            easing: animate.Easing.Cubic.In,
        }).delay(300);
    }

    close() {
        const overlay = this.stage.getView(this.overlay);
        const bg = this.stage.getView(this.background);

        animate.tween(overlay, { opacity: 0 }, {
            duration: 500,
            easing: animate.Easing.Cubic.Out,
        });
        animate.tween(bg, { opacity: 0 }, {
            duration: 500,
            easing: animate.Easing.Cubic.Out,
        }).then(() => {
            this.state = "closed";
        });
    }

    toggle() {
        if (this.state === "open") {
            this.close();
        }
        else {
            this.open();
        }
    }

    project() {
        for (const syntax of progression.getLearnedSyntaxes()) {
            if (!this.syntaxes[syntax]) {
                const defn = progression.getSyntaxDefinition(syntax);

                const children = [];

                const image = Loader.images[defn.header];
                const sprite = gfx.sprite({
                    image,
                    size: { w: image.naturalWidth, h: image.naturalHeight },
                });
                children.push(this.stage.allocate(sprite));

                for (const item of defn.contents) {
                    if (typeof item === "string") {
                        children.push(this.stage.allocate(gfx.text(item, {
                            font: gfx.text.script,
                        })));
                    }
                    else if (item.image) {
                        const img = Loader.images[item.image];
                        const itemSprite = gfx.sprite({
                            image: img,
                            size: { w: img.naturalWidth, h: img.naturalHeight },
                        });
                        children.push(this.stage.allocate(itemSprite));
                    }
                }

                const container = gfx.layout.vbox(
                    gfx.constant(...children),
                    {
                        subexpScale: 1,
                        padding: {
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            inner: 10,
                        },
                    },
                    gfx.baseProjection
                );
                container.anchor = { x: 0.5, y: 0 };
                this.syntaxes[syntax] = this.stage.allocate(container);
            }
        }
    }

    showBox() {
      const state = this.stage.getState();
      const { ctx } = this.stage;
      ctx.save();
      const node = this.stage.semantics.bool(true);
      node.id = nextId();
      const addedNodes = this.stage.semantics.flatten(node).map(immutable.Map);

      const tempNodes = state.get("nodes").withMutations((nodes) => {
          for (const node of addedNodes) {
              nodes.set(node.get("id"), node);
          }
      });

      for(const nn of addedNodes) {
        this.stage.views[nn.get("id")] = this.stage.semantics.project(this.stage,tempNodes,nn);
      }
      
      this.stage.store.dispatch(action.addToolboxItem(addedNodes[0].get("id"), addedNodes));
    }

}
