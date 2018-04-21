import * as chroma from "chroma-js";

import * as gfx from "../gfx/core";
import * as animate from "../gfx/animate";
import * as progression from "../game/progression";
import Audio from "../resource/audio";
import * as random from "../util/random";

import Loader from "../loader";

import BaseStage from "./basestage";
import BaseTouchRecord from "./touchrecord";

export default class ChapterEndStage extends BaseStage {
    constructor(...args) {
        super(...args);

        this.color = "#594764";

        if (progression.isGameEnd()) {
            Audio.play("game-complete");
        }

        this.title = this.allocateInternal(gfx.layout.sticky(
            gfx.text(progression.isGameEnd() ? "You win!" : "Chapter Finished!", {
                fontSize: 64,
                color: "#FFF",
            }),
            "top",
            {
                align: "center",
                margin: 50,
            }
        ));

        this.stars = [];
        this.bgStars = [];
        this.newStars = [];
        this.levelStars = [];

        // this.spawnFirework(
        //     { x: (this.width / 2) - 100, y: this.height - 100 },
        //     { x: this.width / 2, y: this.height / 2 },
        //     0
        // );

        // const count = progression.chapterIdx() + (progression.isGameEnd() ? 10 : 0);
        // for (let i = 0; i < count; i++) {
        //     const offset = random.getRandInt(-250, 250);
        //     const angle = random.getRandInt(0, 24) * ((2 * Math.PI) / 24);
        //     this.spawnFirework(
        //         { x: (this.width / 2) - offset, y: this.height - 100 },
        //         {
        //             x: (this.width / 2) + (100 * Math.cos(angle)),
        //             y: (this.height / 2) + (100 * Math.sin(angle)),
        //         },
        //         i * 750
        //     );
        // }

        const numChapters = progression.ACTIVE_PROGRESSION_DEFINITION.progression.linearChapters.length;
        const bandWidth = this.width / numChapters;
        for (let j = 0; j < numChapters; j++) {
            const lit = j < progression.chapterIdx();
            const lighting = j === progression.chapterIdx();

            for (let i = 0; i < (lighting ? 20 : 8); i++) {
                const idx = random.getRandInt(1, 15);
                const size = random.getRandInt(10, 20);
                const star = gfx.sprite({
                    image: Loader.images[`mainmenu-star${idx}`],
                    size: { h: size, w: size },
                });
                star.anchor = { x: 0.5, y: 0.5 };
                const x = random.getRandInt(j * bandWidth, (j + 1) * bandWidth);
                star.pos = {
                    x,
                    y: random.getRandInt(0, 150) + (0.6 * this.height) + (80 * Math.sin((2 * Math.PI * (x / this.width)))),
                };
                star.opacity = 0.0;
                star.opacityDelta = 0.05;

                const id = this.allocateInternal(star);
                this.stars.push(id);
                if (lit) {
                    this.bgStars.push(id);
                    animate.tween(star, { opacity: (0.5 * Math.random()) + 0.3 }, {
                        duration: 2500,
                        easing: animate.Easing.Cubic.Out,
                    });
                }
                else {
                    animate.tween(star, { opacity: 0.1 }, {
                        duration: 2500,
                        easing: animate.Easing.Cubic.Out,
                    });
                }

                if (lighting) {
                    this.newStars.push([ id, star ]);
                }
            }
        }

        let newStarX = 0;
        let newStarY = 0;
        for (const [ _, newStar ] of this.newStars) {
            newStarX += newStar.pos.x;
            newStarY += newStar.pos.y;
        }
        newStarX /= this.newStars.length;
        newStarY /= this.newStars.length;

        const chapter = progression.currentChapter();
        const spacing = 60;
        const rowStart = (this.width / 2) - (4 * spacing);
        const colStart = this.height / 3;
        const starTweens = [];
        const levelStars = [];
        for (let i = 0; i < chapter.levels.length; i++) {
            const star = gfx.shapes.star({
                color: "gold",
            });
            star.opacity = 0;
            star.anchor = { x: 0.5, y: 0.5 };
            const col = i % 9;
            const row = Math.floor(i / 9);
            star.pos = { x: rowStart + (col * spacing), y: colStart + (row * spacing) };

            starTweens.push(animate.tween(star, { opacity: 1 }, {
                easing: animate.Easing.Cubic.In,
                duration: 300,
                setAnimatingFlag: false,
            }).delay(i * 50));

            const id = this.allocateInternal(star);
            this.levelStars.push(id);
            levelStars.push([ id, star ]);
        }

        Promise.all(starTweens)
            .then(() => {
                const scale = chroma.scale("Spectral").mode("lab");
                const splosions = [];
                for (let i = 0; i < levelStars.length; i++) {
                    const [ id, star ] = levelStars[i];
                    splosions.push(animate.tween(star, {
                        pos: {
                            x: newStarX + random.getRandInt(-20, 21),
                            y: newStarY + random.getRandInt(-20, 21),
                        },
                        scale: { x: 0.3, y: 0.3 },
                    }, {
                        easing: animate.Easing.Cubic.In,
                        duration: 500,
                    }).delay(i * 150)
                        .then(() => {
                            this.levelStars.splice(this.levelStars.indexOf(id), 1);
                            this.newStars.forEach(([ _, newStar ]) => {
                                newStar.opacity = Math.min(1.0, newStar.opacity + 0.1);
                            });

                            return animate.fx.splosion(this, star.pos, {
                                explosionRadius: 400,
                                numOfParticles: 10,
                                duration: 1500,
                                color: idx => scale(idx / 10.0),
                                angle: idx => 2 * Math.PI * (idx / 10),
                            });
                        }));
                }
                return Promise.all(splosions);
            })
            .then(() => {
                for (const [ id, newStar ] of this.newStars) {
                    this.bgStars.push(id);
                    newStar.opacity = Math.random();
                }
            });

        animate.infinite((dt) => {
            for (const id of this.bgStars) {
                const view = this.internalViews[id];
                view.opacity += view.opacityDelta * (dt / 100);
                if (view.opacity > 1.0) {
                    view.opacity = 1.0;
                    view.opacityDelta *= -1;
                }
                else if (view.opacity < 0.2) {
                    view.opacity = 0.2;
                    view.opacityDelta *= -1;
                }
            }
        });

        this.draw();

        if (!progression.isGameEnd()) {
            const continueButton = gfx.ui.button(this, "Next Chapter", {
                click: () => {
                    window.next();
                },
            });
            this.continueButtonId = this.allocateInternal(continueButton);
            this.continueButton = this.internalViews[this.continueButtonId];
            this.continueButton.opacity = 0;
            animate.tween(this.continueButton, { opacity: 1 }, {
                duration: 1000,
                easing: animate.Easing.Cubic.Out,
            }).delay(1000);

            if (progression.hasChallengeChapter()) {
                const challengeButton = gfx.ui.button(this, "Try Challenges", {
                    click: () => {
                        window.next(true);
                    },
                });
                this.challengeButtonId = this.allocateInternal(challengeButton);
                challengeButton.opacity = 0;
                animate.tween(challengeButton, { opacity: 1 }, {
                    duration: 1000,
                    easing: animate.Easing.Cubic.Out,
                }).delay(1000);
            }
        }
    }

    spawnFirework(startPos, targetPos, delay) {
        const firework = gfx.sprite({
            image: Loader.images["mainmenu-star1"],
            size: { h: 40, w: 40 },
        });
        firework.anchor = { x: 0.5, y: 0.5 };
        firework.pos = startPos;
        this.stars.push(this.allocateInternal(firework));
        animate.tween(firework, { opacity: 0.0 }, {
            reverse: true,
            repeat: 5,
            duration: 200,
        }).delay(delay);

        animate.tween(firework.pos, { y: targetPos.y }, {
            duration: 2000,
            easing: animate.Easing.Projectile(animate.Easing.Linear),
        }).delay(delay);

        animate.tween(firework.pos, { x: targetPos.x }, {
            duration: 1000,
        }).delay(delay).then(() => {
            this.stars.shift();
            const scale = { x: 0.1, y: 0.1 };
            const rad = Math.min(this.width, this.height) / 2.5;
            const count = random.getRandInt(15, 30);
            const size = random.getRandInt(25, 40);

            const duration = random.getRandInt(600, 1200);
            for (let i = 0; i < count; i++) {
                const idx = random.getRandInt(1, 15);
                const spark = gfx.sprite({
                    image: Loader.images[`mainmenu-star${idx}`],
                    size: { h: size, w: size },
                });
                spark.anchor = { x: 0.5, y: 0.5 };
                spark.scale = scale;
                spark.pos = { x: firework.pos.x, y: firework.pos.y };
                spark.opacity = 0.0;
                this.stars.push(this.allocateInternal(spark));

                animate.tween(spark, { opacity: 1 }, {
                    duration,
                    easing: animate.Easing.Cubic.Out,
                }).then(() => {
                    animate.tween(spark, { opacity: 0 }, {
                        duration: duration / 3,
                        easing: animate.Easing.Cubic.Out,
                    });
                });
                animate.tween(spark.pos, {
                    x: spark.pos.x + (rad * Math.cos((i * 2 * Math.PI) / count)),
                    y: spark.pos.y + (rad * Math.sin((i * 2 * Math.PI) / count)),
                }, {
                    duration: 1.25 * duration,
                    easing: animate.Easing.Cubic.Out,
                });
            }
            return animate.tween(scale, { x: 1, y: 1 }, {
                duration: 1000,
                easing: animate.Easing.Cubic.Out,
            });
        });
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

        for (const starId of this.stars) {
            this.drawInternalProjection(state, starId);
        }
        for (const starId of this.levelStars) {
            this.drawInternalProjection(state, starId);
        }

        this.drawInternalProjection(state, this.title);

        for (const fx of Object.values(this.effects)) {
            fx.prepare();
            fx.draw();
        }

        if (this.continueButtonId) {
            this.continueButton.prepare(this.continueButtonId, this.continueButtonId, state, this);
            this.continueButton.draw(
                this.continueButtonId, this.continueButtonId, state, this,
                this.makeBaseOffset({
                    x: this.width / 2,
                    y: this.height / 2,
                })
            );
        }
        if (this.challengeButtonId) {
            const view = this.internalViews[this.challengeButtonId];
            view.prepare(this.challengeButtonId, this.challengeButtonId, state, this);
            view.draw(
                this.challengeButtonId, this.challengeButtonId, state, this,
                this.makeBaseOffset({
                    x: this.width / 2,
                    y: (this.height / 2) + 150,
                })
            );
        }
    }

    getNodeAtPos(pos, selectedId=null) {
        const projection = this.continueButton;
        const offset = this.makeBaseOffset({
            x: this.width / 2, y: this.height / 2,
        });

        if (this.continueButtonId) {
            if (projection.containsPoint(pos, offset)) {
                return [ this.continueButtonId, this.continueButtonId ];
            }
        }

        if (this.challengeButtonId) {
            offset.y += 150;
            if (this.internalViews[this.challengeButtonId].containsPoint(pos, offset)) {
                return [ this.challengeButtonId, this.challengeButtonId ];
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
    onstart(mousePos) {
        if (this.topNode && this.stage.internalViews[this.topNode]) {
            const view = this.stage.internalViews[this.topNode];
            if (view.onmousedown) {
                view.onmousedown();
            }
        }
    }

    onend(...args) {
        super.onend(...args);

        if (this.topNode && this.stage.internalViews[this.topNode]) {
            const view = this.stage.internalViews[this.topNode];
            if (view.onclick) {
                view.onclick();
            }
        }
    }
}
