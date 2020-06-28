import { BaseNode, ReductNode } from '..';
import type { NodeDef } from './base';

export interface OpNode extends BaseNode {
  type: 'op';
  fields: { name: '+' | '-' | '<' | '>' | '==' | '&&' | '||' };
}

export const op: NodeDef<OpNode> = {
  kind: 'syntax',
  fields: ['name'],
  subexpressions: [],
  projection: {
    type: 'text',
    text: '{name}'
  }
};

export interface BinOpNode extends BaseNode {
  type: 'binop';

  subexpressions: {
    left: ReductNode;
    op: OpNode;
    right: ReductNode;
  };
}

export const binop: NodeDef<BinOpNode> = {
  kind: 'expression',
  fields: [],
  subexpressions: ['left', 'op', 'right'],
  projection: {
    type: 'case',
    key: (nodes, expr) => nodes.get(expr.subexpressions.op)!.fields.name,
    cases: {
      '+': {
        type: 'default',
        shape: '()',
        color: '#ffcc00'
      },
      '-': {
        type: 'default',
        shape: '()',
        color: '#ffcc00'
      },
      '>': {
        type: 'default',
        shape: '()',
        color: '#ffcc00'
      },
      '<': {
        type: 'default',
        shape: '()',
        color: '#ffcc00'
      },
      '==': {
        type: 'default',
        shape: '<>',
        color: 'hotpink',
        padding: {
          left: 25,
          right: 25,
          inner: 10,
          top: 0,
          bottom: 0
        }
      },
      '&&': {
        type: 'default',
        shape: '<>',
        color: 'hotpink',
        padding: {
          left: 25,
          right: 25,
          inner: 10,
          top: 0,
          bottom: 0
        }
      },
      '||': {
        type: 'default',
        shape: '<>',
        color: 'hotpink',
        padding: {
          left: 25,
          right: 25,
          inner: 10,
          top: 0,
          bottom: 0
        }
      }
    }
  },
  stepSound: (semant, state, expr) => {
    const op = state.nodes.get(expr.subexpressions.op);
    if (op.fields.name === '==') {
      return ['shatter1', 'heatup'];
    }
    return ['heatup'];
  },
  type: (semant, state, types, expr) => {
    const nodes = state.nodes;
    const opExpr = nodes.get(expr.subexpressions.op);
    const id = expr.id;
    const result = new Map();
    if (!opExpr) {
      result.set(id, 'unknown');
    }

    const op = opExpr.fields.name;
    if (op === '==' || op === '||' || op === '&&') {
      result.set(id, 'boolean');

      if (op === '||' || op === '&&') {
        result.set(expr.left, 'boolean');
        result.set(expr.right, 'boolean');
      }
    } else if (op === '+') {
      // Not setting a type for '+',
      // thereby keeping it undefined. This
      // is necessary for concatenation of strings to work in an if else block.
      // If we do not keep it undefined, then the types of the first and second slots
      // in the if block do not match.
      // TODO: (sameer) perhaps can be resolved by creating a new union type for
      //  strings and numbers?
    } else {
      result.set(id, 'number');
      result.set(expr.subexpressions.left, 'number');
      result.set(expr.subexpressions.right, 'number');
    }

    return {
      types: result,
      // TODO: less ad-hoc
      complete: (types.get(expr.subexpressions.left) === 'number'
                           || nodes.get(expr.subexpressions.left).type === 'lambdaVar')
                    && (types.get(expr.subexpressions.right) === 'number'
                     || nodes.get(expr.subexpressions.right).type === 'lambdaVar')
    };
  },
  // Invariant: all subexpressions are values or syntax;
  // none are missing. Return the first subexpression, if
  // any, that is blocking evaluation.
  validateStep: (semant, state, expr) => {
    const nodes = state.nodes;
    const left = expr.subexpressions.left;
    const leftExpr = nodes.get(left);
    const right = expr.subexpressions.right;
    const rightExpr = nodes.get(right);
    const op = nodes.get(expr.subexpressions.op).fields.name;

    if (op === '+') {
      if (leftExpr.ty !== 'number' && leftExpr.type !== 'string') {
        return [left, '+ can only add numbers or strings'];
      }
      if (rightExpr.ty !== 'number' && rightExpr.type !== 'string') {
        return [right, '+ can only add numbers or strings'];
      }
      if (leftExpr.ty === 'number' && rightExpr.type === 'string') {
        return [right, 'cannot add a number and a string'];
      }
      if (leftExpr.type === 'string' && rightExpr.ty === 'number') {
        return [right, 'cannot add a number and a string'];
      }
    }

    if (op === '-' || op === '>' || op === '<') {
      if (leftExpr.ty !== 'number') {
        return [left, `${op} can only ${op === '+' ? 'add' : 'subtract'} numbers!`];
      }
      if (rightExpr.ty !== 'number') {
        return [right, `${op} can only ${op === '+' ? 'add' : 'subtract'} numbers!`];
      }
    } else if (op === '==') {
      if (leftExpr.ty !== rightExpr.ty) {
        return [right, 'Both sides of == need to be the same kind of thing.'];
      }
    } else if (op === '||' || op === '&&') {
      if (leftExpr.ty !== 'boolean') {
        return [left, `${op} can only ${op === '||' ? 'OR' : 'AND'} booleans!`];
      }
      if (rightExpr.ty !== 'boolean') {
        return [right, `${op} can only ${op === '||' ? 'OR' : 'AND'} booleans!`];
      }
    }

    return null;
  },
  // TODO: switch to Immutable.Record to clean this up
  smallStep: (semant, stage, state, expr) => {
    const nodes = state.nodes;
    const op = nodes.get(expr.subexpressions.op).fields.name;
    if (op === '+') {
      if (nodes.get(expr.subexpressions.left).type === 'number') {
        return semant.number(nodes.get(expr.subexpressions.left).fields.value
                        + nodes.get(expr.subexpressions.right).fields.value);
      }

      return semant.string(nodes.get(expr.subexpressions.left).fields.value
                        + nodes.get(expr.subexpressions.right).fields.value);
    }
    if (op === '-') {
      return semant.number(nodes.get(expr.subexpressions.left).fields.value
                                     - nodes.get(expr.subexpressions.right).fields.value);
    }
    if (op === '>') {
      return semant.bool(nodes.get(expr.subexpressions.left).fields.value
                                   > nodes.get(expr.subexpressions.right).fields.value);
    }

    if (op === '<') {
      return semant.bool(nodes.get(expr.subexpressions.left).fields.value
                                   < nodes.get(expr.subexpressions.right).fields.value);
    }
    if (op === '==') {
      return semant.bool(semant.deepEqual(nodes,
        nodes.get(expr.subexpressions.left),
        nodes.get(expr.subexpressions.right)));
    }
    if (op === '||') {
      return semant.bool(nodes.get(expr.subexpressions.left).fields.value
                                   || nodes.get(expr.subexpressions.right).fields.value);
    }
    if (op === '&&') {
      return semant.bool(nodes.get(expr.subexpressions.left).fields.value
                                   && nodes.get(expr.subexpressions.right).fields.value);
    }
    throw `Unrecognized operator ${op}`;
  }
};
