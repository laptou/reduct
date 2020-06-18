import type { BaseNode, ReductNode } from '..';
import * as fx from '../../gfx/fx';
import { genericBetaReduce } from '../core';
import type { NodeDef } from './base';

export interface LambdaNode extends BaseNode {
  type: 'lambda';

  subexpressions: {
    arg: LambdaArgNode;
    body: ReductNode;
  };
}

export interface LambdaArgNode extends BaseNode {
  type: 'lambdaArg';

  fields: {
    name: string;
    functionHole: any;
  };
}

export interface LambdaVarNode extends BaseNode {
  type: 'lambdaVar';

  fields: {
    name: string;
  };
}

export const lambda: NodeDef<LambdaNode> = {
  kind: 'value',
  type: (semant, state, types, expr) => ({
    types: new Map([[expr.id, 'lambda']]),
    complete: typeof types.get(expr.subexpressions.body) !== 'undefined'
  }),
  fields: [],
  subexpressions: ['arg', 'body'],
  projection: {
    type: 'default',
    shape: '()',
    fields: ['arg', '\'=>\'', 'body'],
    subexpScale: 1.0,
    padding: {
      top: 3.5,
      bottom: 3.5,
      left: 10,
      right: 10,
      inner: 5
    }
  },
  betaReduce: (semant, stage, state, expr, argIds) => genericBetaReduce(semant, state, {
    topNode: expr,
    targetNode: state.nodes.get(expr.subexpressions.arg),
    argIds,
    targetName: (node) => node.fields.name,
    isVar: (node) => node.type === 'lambdaVar',
    varName: (node) => node.fields.name,
    isCapturing: (node) => node.type === 'lambda',
    captureName: (nodes, node) => nodes.get(node.subexpressions.arg).fields.name,
    animateInvalidArg: (id) => {
      const node = state.nodes.get(id);
      if (node.type === 'lambdaVar') {
        stage.feedback.update('#000', [`We don't know what ${node.name} is!`]);
      }
      fx.error(stage, stage.views[id]);
    }
  })
};

export const lambdaArg: NodeDef<LambdaArgNode> = {
  fields: ['name', 'functionHole'],
  subexpressions: [],
  targetable: (semant, state, expr) => {
    const nodes = state.nodes;
    const lambdaParent = nodes.get(expr.parent);
    return !lambdaParent.parent;
  },
  projection: {
    type: 'preview',
    content: {
      type: 'dynamic',
      resetFields: ['text', 'color'],
      field: (state, exprId) => {
        const isFunctionHole = !!state.nodes.get(exprId).functionHole;
        if (isFunctionHole) return 'functionHole';
        return 'default';
      },
      default: {
        type: 'text',
        text: '({name})'
      },
      cases: {
        functionHole: {
          type: 'default',
          shape: '()',
          radius: 0,
          fields: ['name']
        }
      }
    }
  },
  betaReduce: (semant, stage, state, expr, argIds) => {
    if (expr.parent) {
      return semant.interpreter.betaReduce(stage, state, expr.parent, argIds);
    }
    return null;
  }
};

export const lambdaVar: NodeDef<LambdaVarNode> = {
  fields: ['name'],
  subexpressions: [],
  projection: {
    type: 'dynamic',
    field: (state, exprId) => {
      const nodes = state.nodes;
      let current = nodes.get(exprId);
      const myName = current.name;
      while (current.parent) {
        current = nodes.get(current.parent);
        if (current.type === 'lambda'
                        && nodes.get(current.subexpressions.arg).fields.name === myName) {
          return 'enabled';
        }
      }
      return 'default';
    },
    onKeyChange: (view, id, exprId, state, stage) => {
      if (view.dynamicKey === 'enabled') {
        fx.blink(stage, view, {
          times: 3,
          speed: 100,
          color: '#6df902'
        });

        const nodes = state.nodes;
        let current = nodes.get(exprId);
        const myName = current.fields.name;
        while (current.parent) {
          current = nodes.get(current.parent);
          if (current.type === 'lambda'
                            && nodes.get(current.subexpressions.arg).name === myName) {
            fx.blink(stage, stage.getView(current.arg), {
              times: 3,
              speed: 100,
              color: '#6df902',
              field: 'outerStroke'
            });

            break;
          }
        }
      }
    },
    default: {
      type: 'hbox',
      shape: '()',
      strokeWhenChild: false,
      cols: [
        {
          type: 'text',
          text: '{name}',
          color: 'gray'
        }
      ]
    },
    cases: {
      enabled: {
        type: 'preview',
        content: {
          type: 'default',
          shape: '()',
          strokeWhenChild: false,
          fields: ['name']
        }
      }
    }
  }
};
