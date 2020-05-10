import * as immutable from 'immutable';
import * as gfx from '../gfx/core';
import * as animate from '../gfx/animate';
import * as progression from '../game/progression';
import Audio from '../resource/audio';
import Logging from '../logging/logging';
import Loader from '../loader';
import es6 from '../semantics/es6';
import BaseStage from './basestage';
import BaseTouchRecord from './touchrecord';

export default class LevelStage extends BaseStage {
    constructor(startGame, chapterName, ...args) {
        super(...args);

        this.startGame = startGame;
        this.color = '#8ab7db';

        // allocating title ID
        const title = gfx.layout.sticky(
            gfx.layout.ratioSizer(gfx.text(`${chapterName}`, {
                fontSize: 200,
                font: gfx.text.script
            }), 213 / 899, 0.6),
            'center',
            {}
        );
        title.opacity = 0;
        this.title = this.allocateInternal(title);

        const label = this.allocate(gfx.text('Chapter List', {
            fontSize: 30,
            font: gfx.text.script
        }));

        const backButton = gfx.layout.sticky(gfx.ui.button(this, () => [label], {
            color: '#e95888',
            subexpScale: 1,
            anchor: {
                x: 0,
                y: 0
            },
            click: () => {
                window.init();
            }
        }), 'top', {});

        this.backButton = this.allocate(backButton);
        backButton.opacity = 0.0;


        const buttons = [];
        const start = Loader.progressions.Elementary.chapters[chapterName].startIdx;
        const end = Loader.progressions.Elementary.chapters[chapterName].endIdx;
        const curLvl = progression.currentLevel();

        // allocating button ID
        for (let beginLvl = start; beginLvl <= end; beginLvl++) {
            const label = this.allocate(gfx.text(`Level: ${beginLvl + 1}`, {
                fontSize: 20,
                font: gfx.text.mono
            }));

            if (beginLvl < curLvl) {
                const button = gfx.ui.button(this, () => [label], {
                    color: '#e95888',
                    anchor: {
                        x: 0,
                        y: 0
                    },
                    subexpScale: 1,
                    click: () => {
                        progression.setLevel(beginLvl);
                        this.animateStart();
                    }
                });
                buttons.push(this.allocate(button));
            } else if (beginLvl == curLvl) {
                const button = gfx.ui.button(this, () => [label], {
                    color: '#ffcc00',
                    anchor: {
                        x: 0,
                        y: 0
                    },
                    subexpScale: 1,
                    click: () => {
                        progression.setLevel(beginLvl);
                        this.animateStart();
                    }
                });
                buttons.push(this.allocate(button));
            } else {
                const button = gfx.ui.button(this, () => [label], {
                    shadow: true,
                    anchor: {
                        x: 0,
                        y: 0
                    },
                    subexpScale: 1,
                    click: () => {
                        if (window.devMode) {
                            progression.setLevel(beginLvl);
                            this.animateStart();
                        }
                    }
                });
                buttons.push(this.allocate(button));
            }
        }

        this.buttons = buttons;

        const myLayouts = [];
        let numLayouts = 0;
        this.myLayouts = [];

        function genLayouts(stage, arrayButtons) {
            let workButtons = [];
            if (arrayButtons.length <= 5) {
                workButtons = arrayButtons;

                myLayouts[numLayouts] = gfx.layout.hbox(() => workButtons, {
                    subexpScale: 1.0,
                    padding: {
                        inner: 20,
                        top: stage.height + numLayouts * 100,
                        left: 250
                    }
                }, gfx.baseProjection);

                myLayouts[numLayouts].opacity = 0.0;
                stage.myLayouts.push(stage.allocate(myLayouts[numLayouts]));
                numLayouts++;
            } else {
                workButtons = arrayButtons.slice(0, 5);

                myLayouts[numLayouts] = gfx.layout.hbox(() => workButtons, {
                    subexpScale: 1.0,
                    padding: {
                        inner: 20,
                        top: stage.height + numLayouts * 100,
                        left: 250
                    }
                }, gfx.baseProjection);

                myLayouts[numLayouts].opacity = 0.0;
                stage.myLayouts.push(stage.allocate(myLayouts[numLayouts]));
                numLayouts++;

                genLayouts(stage, arrayButtons.slice(5));
            }
        }


        genLayouts(this, buttons);

        /*
         let newInputIds = [];
         const ss = "57 + 1";
         const st = stage.getState();
         const parsed_s = es6.parser.parse(ss,[]);
         const flattened_s = es6.flatten(parsed_s).map(immutable.Map);

         //create temporary nodes
         const tempNodes = st.get("nodes").withMutations((nodes) => {
           for (const node of flattened_s) {
             nodes.set(node.get("id"), node);
           }
         });

         //define views
         let nodezzz;
         let myViews = [];
         let i =0;
         const newViews = [];
         for(const aa of flattened_s) {
           newInputIds.push(aa.get("id"));
            myViews[i++] = es6.project(stage,tempNodes,aa);
         }
         for(let j = i-1;j >=0 ;j--){
            newViews.push(this.allocate(myViews[j]));
         }

         this.newViews = newViews;

         console.log(newViews);
         nodezzz = gfx.layout.hbox(() => [newViews[i-1]], {
             subexpScale: 1.0,
             padding: {
                 inner: 20,
                 top: 250,
                 left: 250,
             },
         }, gfx.baseProjection);

        this.nodezzz = this.allocate(nodezzz);
        nodezzz.opacity = 1.0;
        nodezzz.pos.x = 300;
        nodezzz.pos.y = 300;
        console.log("parsed:s " + JSON.stringify(nodezzz));
        */

        // ** Startup Animations ** //

        this.state = 'initializing';
        animate.tween(this, {
            color: '#FFF'
        }, {
            duration: 500,
            setAnimatingFlag: false,
            easing: animate.Easing.Color(animate.Easing.Cubic.In, this.color, '#FFF')
        })
            .then(() => animate.tween(title, {
                opacity: 1.0
            }, {
                duration: 500,
                easing: animate.Easing.Cubic.Out
            }).delay(1000))
            .then(() => Promise.all([
                animate.tween(title, {
                    scale: { x: 0.7, y: 0.7 },
                    sticky: { marginY: -180 }
                }, {
                    duration: 800,
                    easing: animate.Easing.Cubic.Out
                }),
                animate.tween(backButton, {
                    opacity: 1.0
                }, {
                    duration: 1000,
                    easing: animate.Easing.Cubic.Out
                })
            ]))
            .then(() => {
                for (let i = 0; i < myLayouts.length; i++) {
                    animate.tween(myLayouts[i], {
                        opacity: 1.0
                    }, {
                        duration: 1000,
                        easing: animate.Easing.Cubic.Out
                    });
                }
            })
            .then(() => {
                this.state = 'initialized';
            });
    }

    _mouseup(e) {
        if (this.state === 'initializing') {
            this.fastForward();
        }

        super._mouseup(e);
    }

    fastForward() {
        animate.clock.cancelAll();
        this.state = 'initialized';
        this.color = '#FFF';
        const title = this.getView(this.title);
        title.opacity = 1.0;
        title.scale = { x: 0.7, y: 0.7 };
        title.sticky.marginY = -180;

        for (let i = 0; i < this.myLayouts.length; i++) {
            this.getView(this.myLayouts[i]).opacity = 1.0;
        }
        this.getView(this.backButton).opacity = 1.0;
    }

    animateStart() {
        this.state = 'transitioning';


        Promise.all([
            animate.tween(this.getView(this.title), {
                scale: { x: 0.4, y: 0.4 },
                opacity: 0.5
            }, {
                duration: 800,
                easing: animate.Easing.Cubic.In
            }),
            animate.tween(this.getView(this.title), {
                sticky: { marginY: -this.height }
            }, {
                duration: 500,
                easing: animate.Easing.Anticipate.BackIn(1.5)
            }),
            animate.tween(this.getView(this.backButton), {
                opacity: 0
            }, {
                duration: 500,
                easing: animate.Easing.Cubic.In
            }),
            animate.tween(this, {
                color: '#8ab7db'
            }, {
                duration: 500,
                setAnimatingFlag: false,
                easing: animate.Easing.Color(animate.Easing.Cubic.In, this.color, '#8ab7db')
            })
        ]).then(() => {
            for (let i = 0; i < this.myLayouts.length; i++) {
                animate.tween(this.getView(this.myLayouts[i]), {
                    opacity: 0
                }, {
                    duration: 500,
                    easing: animate.Easing.Cubic.In
                });
            }
        })
            .then(() => this.startGame());
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

        for (let i = 0; i < this.myLayouts.length; i++) {
            this.drawProjection(state, this.myLayouts[i]);
        }

        this.drawProjection(state, this.backButton);
    }

    getNodeAtPos(pos, selectedId = null) {
        if (this.state !== 'initialized') return [null, null];

        const offset = this.makeBaseOffset();
        const backLayout = this.getView(this.backButton);


        if (backLayout.containsPoint(pos, offset)) {
            const topLeft = gfx.util.topLeftPos(backLayout, offset);
            const subpos = {
                x: pos.x - topLeft.x,
                y: pos.y - topLeft.y
            };

            return [this.backButton, this.backButton];
        }


        for (const id of this.buttons) {
            const button = this.getView(id);
            if (button.containsPoint(pos, offset)) {
                return [id, id];
            }
        }

        return [null, null];
    }

    updateCursor(touchRecord, moved = false) {
        if (touchRecord.hoverNode !== null) {
            this.setCursor('pointer');
        } else {
            this.setCursor('default');
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
