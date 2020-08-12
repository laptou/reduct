/* this file is no longer used -iaa34 */
/* eslint-disable */

import * as gfx from '../gfx/core';
import * as animate from '../gfx/animate';
import Logging from '../logging/logging';

import Stage from './stage';

import { templateText } from '../ui/goal';

/**
 * The level stage with a tutorial overlay.
 */
export default class TutorialStage extends Stage {
  constructor(...args) {
    super(...args);

    this.tutorialState = new GoalTutorial(this);
    this.skipButton = this.allocate(gfx.layout.sticky(gfx.ui.button(this, 'Skip Tutorial', {
      color: '#e95888',
      click: () => {
        Logging.log('tutorial-skip', this.tutorialState.state);
        this.tutorialState.state = 'done';
        this.tutorialState.ready = true;
      },
    }), 'bottom', {
      align: 'right',
      margin: 20,
      marginX: 20,
    }));
  }

  getNodeAtPos(pos, ...args) {
    if (this.tutorialState.state !== 'done') {
      const state = this.getState();
      const result = this.testNodeAtPos(
        state, pos, this.skipButton, this.skipButton, null, this.makeBaseOffset(), (id) => id === this.skipButton
      );
      if (result) {
        return [result[1], result[1]];
      }
    }
    return super.getNodeAtPos(pos, ...args);
  }

  drawContents() {
    super.drawContents();

    if (this.tutorialState.state !== 'done') {
      this.tutorialState.drawContents();
      const skip = this.getView(this.skipButton);
      const state = this.getState();
      skip.prepare(this.skipButton, this.skipButton, state, this);
      skip.draw(this.skipButton, this.skipButton, state, this, this.makeBaseOffset());
    }
  }

  _mousedown(e) {
    if (!this.tutorialState.next() && this.tutorialState.allowEvents) {
      super._mousedown(e);
    } else if (this._touches.mouse.hoverNode) {
      const hovered = this._touches.mouse.hoverNode;
      if (this.getView(hovered).onclick) {
        this.getView(hovered).onclick();
      }
    }
  }

  _touchstart(e) {
    if (!this.tutorialState.next() && this.tutorialState.allowEvents) {
      super._touchstart(e);
    }
  }
}

class GoalTutorial {
  constructor(stage) {
    this.stage = stage;
    this.r = stage.width;
    this.x = 0;
    this.y = 0;
    this.opacity = 0;

    this.state = 'started';
    this.ready = false;

    const goalText = gfx.text(templateText(stage.semantics, 'The alien needs {a star}!'), {
      font: gfx.text.script,
      opacity: 0,
      color: '#FFF',
      fontSize: 42,
    });
    this.goalText = stage.allocate(goalText);

    this.boardText = stage.allocate(gfx.text(templateText(stage.semantics, 'Drag the {star} into the (x)!'), {
      font: gfx.text.script,
      opacity: 0,
      color: '#FFF',
      fontSize: 42,
    }));

    this.continueText = stage.allocate(gfx.layout.sticky(gfx.text('Click to continue', {
      font: gfx.text.script,
      opacity: 1,
      color: '#FFF',
      fontSize: 48,
    }), 'bottom', {
      align: 'center',
      margin: 15,
    }));

    let time = 0;
    this.infinite = animate.infinite((dt) => {
      time += dt;

      if (this.ready && this.state === 'goal') {
        const state = this.stage.getState();

        for (const id of state.goal) {
          this.stage.getView(id).stroke = {
            color: '#0FF',
            lineWidth: 2 - Math.cos(time / 600),
          };
        }
      }

      if (this.ready && this.state !== 'done') {
        this.stage.getView(this.continueText).opacity = 0.5 - (0.5 * Math.cos(time / 600));
      } else {
        this.stage.getView(this.continueText).opacity = 0;
        time = 0;
      }

      if (this.state === 'done') {
        this.infinite.stop();
      }
    });
  }

  get allowEvents() {
    return (this.state === 'board' || this.state === 'done') && this.ready;
  }

  startLevel(...args) {
    super.startLevel(...args);

    Logging.log('tutorial-state-next', this.state);
  }

  next() {
    if (!this.ready) return true;

    if (this.state === 'goal') {
      this.ready = false;
      let bbx = 10000;
      let bby = 10000;
      let bbmx = 0;
      let bbmy = 0;
      let bbw = 0;
      let bbh = 0;

      for (const id of this.stage.getState().board) {
        const view = this.stage.getView(id);
        const pos = gfx.absolutePos(view);
        bbx = Math.min(bbx, pos.x);
        bby = Math.min(bby, pos.y);
        bbmx = Math.max(bbmx, pos.x + view.size.w);
        bbmy = Math.max(bbmy, pos.y + view.size.h);
      }

      bbw = bbmx - bbx;
      bbh = bbmy - bby;

      const afterR = 1.1 * (Math.max(bbw, bbh) * (Math.sqrt(2) / 2));
      const afterX = bbx + (bbw / 2);
      const afterY = bby + (bbh / 2);

      const goalText = this.stage.getView(this.goalText);
      const boardText = this.stage.getView(this.boardText);

      boardText.pos.x = afterX;
      boardText.pos.y = afterY + afterR;

      const state = this.stage.getState();

      for (const id of state.goal) {
        this.stage.getView(id).stroke = null;
      }

      animate.tween(goalText, { opacity: 0 }, {
        duration: 1000,
        easing: animate.Easing.Cubic.In,
      });
      animate.tween(this, {
        x: afterX,
        y: afterY,
        r: afterR, 
      }, {
        duration: 3000,
        easing: animate.Easing.Cubic.InOut,
      })
        .then(() => {
          if (this.state === 'done') return;

          this.state = 'board';
          Logging.log('tutorial-state-next', this.state);
          animate.tween(boardText, { opacity: 1 }, {
            duration: 1000,
            easing: animate.Easing.Cubic.In,
          });
        })
        .then(() => {
          this.ready = true;
          this.stage.getView(this.continueText).text = 'Drag the star to continue';
          this.stage.draw();
        });
    } else if (this.state === 'board') {
      animate.tween(this, { opacity: 0 }, {
        duration: 500,
        easing: animate.Easing.Cubic.In,
      }).then(() => {
        if (this.state === 'done') return;

        this.state = 'done';
        Logging.log('tutorial-state-next', this.state);
        this.ready = true;
        this.stage.draw();
      });
    }

    return false;
  }

  drawContents() {
    const { ctx, width, height } = this.stage;
    const {
      x, y, r, opacity,
    } = this;

    if (this.state === 'started') {
      this.state = 'goal';
      const goalContainer = this.stage.getView(this.stage.goal.container);
      const alienView = this.stage.getView(this.stage.goal.alien);
      const targetR = gfx.absoluteSize(goalContainer).w + alienView.size.w;

      const goalText = this.stage.getView(this.goalText);
      goalText.pos.x = targetR;
      goalText.pos.y = 20;

      animate.after(1000)
        .then(() => animate.tween(this, {
          r: targetR,
          opacity: 0.7, 
        }, {
          duration: 2000,
          easing: animate.Easing.Cubic.InOut,
        }))
        .then(() => animate.tween(goalText, { opacity: 1 }, {
          duration: 1000,
          easing: animate.Easing.Cubic.In,
        }))
        .then(() => {
          this.ready = true;
          this.stage.draw();
        });
    }

    const state = this.stage.getState();
    if (this.state !== 'done') {
      ctx.save();
      ctx.fillStyle = 'black';
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.lineTo(0, 0);
      ctx.arc(x, y, r, 2 * Math.PI, false);
      ctx.fill('evenodd');
      ctx.restore();

      if (this.ready) {
        this.stage.drawProjection(state, this.continueText);
      }
    }

    if (this.state === 'goal') {
      this.stage.drawProjection(state, this.goalText);

      for (const id of state.goal) {
        const goalText = this.stage.getView(this.goalText);
        this.stage.getView(id).pos.x = 0;
        this.stage.drawProjection(state, id, this.stage.makeBaseOffset({
          x: goalText.pos.x + goalText.size.w + 10,
          y: goalText.pos.y,
          opacity: goalText.opacity,
        }));
      }
    } else if (this.state === 'board') {
      this.stage.drawProjection(state, this.boardText);
    }
  }
}
