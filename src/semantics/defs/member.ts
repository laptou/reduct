import type { BaseNode, ReductNode } from '..';

import type { NodeDef } from './base';

export interface MemberNode extends BaseNode {
  type: 'member';

  subexpressions: {
    array: ReductNode;
    index: ReductNode;
  };
}

// TODO: rename to 'index', 'member' is a stupid name
export const member: NodeDef<MemberNode> = {
  kind: 'expression',
  fields: [],
  subexpressions: ['array', 'index'],
  projection: {
    type: 'hbox',
    color: 'red',
    subexpScale: 0.9,
    cols: [
      {
        type: 'default',
        shape: 'none',
        fields: ['array'],
        subexpScale: 1.0,
      },
      {
        type: 'default',
        shape: 'none',
        fields: ['\'[\'', 'index', '\']\''],
        subexpScale: 1.0,
      },
    ],
  },
  validateStep: (semant, state, expr) => {
    const nodes = state.nodes;
    const arrayId = expr.array;
    const indexId = expr.index;

    const array = nodes.get(arrayId);
    const index = nodes.get(indexId);

    if (array.type !== 'array') {
      return [arrayId, 'This needs to be an array!'];
    }

    if (index.type !== 'number') {
      return [indexId, 'This needs to be a number!'];
    }
    if (index.value >= array.length) {
      return [indexId, 'Index cannnot be greater than the length!'];
    }

    return null;
  },
  smallStep: (semant, stage, state, expr) => {
    const nodes = state.nodes;

    const array = nodes.get(expr.array);
    const index = nodes.get(expr.index);
    const i = index.value;
    const res = nodes.get((array.get(`elem${i}`)));
    return semant.number(res.value);
  },
};
