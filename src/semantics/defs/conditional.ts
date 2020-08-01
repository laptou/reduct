import type { BaseNode, ReductNode } from '..';
import * as animate from '../../gfx/animate';
import * as gfx from '../../gfx/core';

import type { NodeDef } from './base';


/**
 * ConditionalNode is a reduct node representing an conditional expression
 */
export interface ConditionalNode extends BaseNode {
  type: 'conditional';
  subexpressions: {
    condition: ReductNode;
    positive: ReductNode;
    negative: ReductNode;
  };
}

export const conditional: NodeDef<ConditionalNode> = {
  kind: 'expression',
  fields: [],
  subexpressions: ['condition', 'positive', 'negative'],
  projection: {
    type: 'vbox',
    horizontalAlign: 0.0,
    color: 'lightblue',
    subexpScale: 1.0,
    ellipsize: true,
    rows: [
      {
        type: 'default',
        shape: 'none',
        fields: ['\'if\'', 'condition', '\'then\''],
        subexpScale: 1.0,
      },
      {
        type: 'default',
        shape: 'none',
        fields: ['\'    \'', 'positive'],
        subexpScale: 1.0,
      },
      {
        type: 'default',
        shape: 'none',
        fields: ['\'else\''],
        subexpScale: 1.0,
      },
      {
        type: 'default',
        shape: 'none',
        fields: ['\'    \'', 'negative'],
        subexpScale: 1.0,
      },
    ],
  },
  type: (semant, state, types, expr) => {
    const result = new Map();
    const positiveTy = types.get(expr.positive);
    const branchesMatch = positiveTy === types.get(expr.negative)
      && positiveTy !== null
      && typeof positiveTy !== 'undefined';
    if (branchesMatch) {
      result.set(expr.id, types.get(expr.positive));
    }
    result.set(expr.condition, 'boolean');

    return {
      types: result,
      complete: branchesMatch && types.get(expr.condition) === 'boolean',
    };
  },
  validateStep: (semant, state, expr) => {
    const nodes = state.nodes;
    const condition = expr.condition;
    if (nodes.get(condition).ty !== 'boolean') {
      return [condition, 'The first slot of \'if\' needs to be <true> or <false>.'];
    }

    const positive = expr.positive;
    const negative = expr.negative;
    const posType = nodes.get(positive).ty;
    const negType = nodes.get(negative).ty;
    if (posType && negType && posType !== negType) {
      return [negative, 'The second and third slot of \'if\' need to be the same kind of thing!'];
    }
    return null;
  },
  smallStep: (semant, stage, state, expr) => {
    const nodes = state.nodes;
    const cond = nodes.get(expr.condition).value;
    // TODO: do this cleanup in evaluation?
    if (cond) {
      return nodes.get(expr.positive)
        .delete('parent')
        .delete('parentField');
    }
    return nodes.get(expr.negative)
      .delete('parent')
      .delete('parentField');
  },
  // Filter to determine which subexpressions to evaluate
  // before stepping the overall expression.
  substepFilter: (state, expr, field) => field === 'condition',
  stepPosition: (semant, stage, state, expr) => {
    const nodes = state.nodes;
    const cond = nodes.get(expr.subexpressions.condition).fields.value;
    const view = stage.getView(expr.subexpressions[cond ? 'positive' : 'negative']);
    return {
      x: gfx.centerPos(view).x,
      y: gfx.centerPos(view).y,
    };
  },
  stepAnimation: (semant, stage, state, expr) => {
    const nodes = state.nodes;
    const cond = nodes.get(expr.condition).value;
    const color = cond ? '#00F' : '#F00';
    const branchId = cond ? expr.positive : expr.negative;
    const branch = stage.getView(branchId);

    const view = stage.getView(expr.condition);

    view.stroke = {
      lineWidth: 1,
      color, 
    };
    const reset = [];
    const speed = animate.scaleDuration(300, 'expr-conditional');
    const pauseTime = animate.scaleDuration(700, 'expr-conditional');
    const totalDuration = speed * 3;
    const restTime = totalDuration + pauseTime;

    return animate.tween(view, { stroke: { lineWidth: 4 } }, {
      duration: animate.scaleDuration(700, 'expr-conditional'),
      easing: animate.Easing.Cubic.In,
    })
      .then(() => {
        branch.stroke = {
          lineWidth: 1,
          color, 
        };
        return animate.tween(branch, { stroke: { lineWidth: 4 } }, {
          duration: animate.scaleDuration(700, 'expr-conditional'),
          easing: animate.Easing.Cubic.In,
        });
      })
      .then(() => animate.after(pauseTime))
      .then(() => {
        const condView = stage.getView(expr.id);

        // Animate away the parts that are not the chosen branch
        let ctr = 0;
        const safe = cond ? 1 : 3;
        for (const [childId] of condView.children(expr.id, state)) {
          if (ctr !== safe) {
            reset.push(animate.tween(stage.getView(childId), {
              scale: { y: 0 },
            }, {
              duration: totalDuration,
              restTime,
              easing: animate.Easing.Cubic.InOut,
            }));
            reset.push(animate.tween(stage.getView(childId), {
              opacity: 0,
            }, {
              duration: totalDuration / 8,
              easing: animate.Easing.Cubic.In,
            }));
          }
          ctr += 1;
        }
        reset.push(animate.tween(condView, {
          padding: {
            top: 0,
            bottom: 0,
            inner: 0,
            right: 0,
            left: 0,
          },
          backgroundOpacity: 0,
          subexpScale: 1,
        }, {
          duration: totalDuration,
          restTime,
          easing: animate.Easing.Cubic.InOut,
        }));

        return Promise.all(reset);
      })
      .then(() => animate.after(pauseTime))
      .then(() => {
        view.stroke = null;
        branch.stroke = null;
        reset.forEach((tween) => tween.undo());
      });
  },
};
