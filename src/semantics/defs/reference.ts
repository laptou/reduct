import * as core from '../core';
import { builtins, genericValidate } from './builtins';
import { BaseNode, NodeId } from '..';
import { NodeDef } from './base';
import { withoutParent } from '@/util/helper';

/**
 * A node which represents a reference to a name.
 */
export interface InvocationNode extends BaseNode {
  type: 'reference';
  fields: { name: string };
}

/**
 * A node which represents a function call.
 */
export interface InvocationNode2 extends InvocationNode {
  // if the invocation has a parameter 'f', the node will have a property 'arg_f'
  // TODO refactor that
  fields: { name: string; params: string[] } & Record<string, NodeId>;
}

const baseReference: NodeDef<InvocationNode> = {
  kind: 'expression',
  fields: ['name'],
  subexpressions: [],
  stepSound: 'heatup',
  type: (semant, state, types, expr) => ({
    types: new Map(),
    complete: state.globals.has(expr.name)
  }),
  targetable: (semant, state, expr) => {
    if (expr.__meta?.toolbox.targetable) {
      return true;
    }
    if (state.toolbox.has(expr.id)) {
      // If in toolbox, only targetable if defined
      return state.globals.has(expr.fields.name);
    }
    return !expr.parent || !expr.locked;
  },
  smallStep: (semant, stage, state, expr) => {
    let res = state.globals.get(expr.fields.name);
    if (!res) return null;

    const resNode = state.nodes.get(res)!;
    if (resNode.type === 'define') {
      res = resNode.subexpressions.body;
    }

    const result = semant.clone(res, state.nodes);
    return [
      expr.id,
      [result[0].id],
      [withoutParent(result[0]), ...result[1]]
    ];
  },
  validateStep: (semant, state, expr) => {
    if (!state.globals.has(expr.fields.name)) {
      return [
        expr.id,
        `We don't know what '${expr.fields.name}' is yet! Look for a "def ${expr.fields.name}".`
      ];
    }
    const name = expr.fields.name;
    if (!builtins.has(name)) return null;

    const { validate } = builtins.get(name);
    const val = validate
      ? validate(expr, semant, state)
      : genericValidate(expr, semant, state);
    if (!val) return null; // VALID
    return [expr.subexpressions[val.subexpr], val.msg];
  },
  projection: {
    type: 'dynamic',
    field: (state, exprId) => {
      const name = state.nodes.get(exprId).fields.name;
      if (state.globals.has(name)) {
        return 'enabled';
      }
      return 'default';
    },
    default: {
      type: 'hbox',
      color: 'OrangeRed',
      radius: 0,
      shape: '()',
      strokeWhenChild: true,
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
        type: 'hbox',
        color: 'OrangeRed',
        radius: 0,
        shape: '()',
        strokeWhenChild: true,
        cols: [
          {
            type: 'text',
            text: '{name}'
          }
        ]
      }
    }
  }
};

const invocationReference: NodeDef<InvocationNode2> = {
  ...baseReference,
  fields: ['name', 'params'],
  subexpressions: (semant, expr) => {
    const params = expr.fields.params ?? [];
    return params.map((name) => `arg_${name}`);
  },
  /* The kind of a ref with or without params:
   *  f           : expr
   *  f a a a a   : expr
   *  f a a • •   : expr if f not builtin, value otherwise
   *  f • • • •   : topexpr (that is, treat as value if not at top)
   *  f • a • •   : expr (could be a topexpr)
   */
  kind: (ref, semant, state) => {
    const nodes = state.nodes;
    const params = ref.fields.params;
    const nparams = params ? params.length : 0;
    const builtin = builtins.has(ref.fields.name);
    let incomplete = false;
    let args = false;
    for (let i = 0; i < nparams; i++) {
      const p = params[i];
      const arg = nodes.get(ref.subexpressions[`arg_${p}`])!;
      const hole = (arg.type == 'missing');
      incomplete |= hole;
      args |= !hole;
      if (!incomplete && semant.kind(state, arg) === 'expression') {
        return 'expression';
      }
      if (incomplete && !hole) return 'expression'; // topexpr?
    }
    if (!incomplete) return 'expression';
    if (!args) return 'value'; // topexpr. Or do we let substepFilter handle this?
    return 'value'; // treat builtins and user definitions the same way - desirable?
    // return builtin ? "value" : "expression";
  },
  smallStep: (semant, stage, state, expr) => {
    // TODO: reuse orig smallStep somehow
    let res = state.globals.get(expr.fields.name);
    if (!res) return null;

    const resNode = state.nodes.get(res)!;
    if (resNode.type === 'define') {
      res = resNode.subexpressions.body;
    }

    const name = expr.fields.name;

    if (builtins.has(name)) {
      const { impl } = builtins.get(name);
      if (impl) {
        const resultExpr = impl(expr, semant, state.nodes);
        if (resultExpr == null) {
          console.error(`Small step on ${expr.type} failed`);
          return null;
        }
        return core.makeResult(expr, resultExpr, semant);
        // return resultExpr;
      }
      console.error(`Undefined builtin implementation: ${name}`);
    }

    if (!(expr.parent && state.nodes.get(expr.parent)!.type === 'define')
          && expr.fields.params?.length > 0
          && expr.fields.params?.some((field) =>
            state.nodes.get(expr.subexpressions[`arg_${field}`])!.type !== 'missing')) {
      const params = expr.fields.params;
      const result = semant.interpreter.betaReduce(
        stage,
        state,
        res,
        params.map((name) => expr.subexpressions[`arg_${name}`])
      );
      if (result) {
        const [_, newNodeIds, addedNodes] = result;
        return [expr.id, newNodeIds, addedNodes];
      }
      return null;
    }

    const result = semant.clone(res, state.nodes);
    return [
      expr.id,
      [result[0].id],
      [withoutParent(result[0]), ...result[1]]
    ];
  },
  // Only care about arguments if partially filled
  substepFilter: (semant, state, expr, field) => {
    const params = expr.fields.params;
    if (!params || params.length === 0) {
      // wait, wtf?
      console.warn(`es6.reference#substepFilter: No params, but asked about field ${field}?`);
      return true;
    }

    return !params.every((p) => state.nodes.get(expr.subexpressions[`arg_${p}`]).type === 'missing');
  },
  betaReduce: (semant, stage, state, expr, argIds) => {
    const nodes = state.nodes;
    const result = semant.hydrate(nodes, expr);
    const np = result.params ? result.params.length : 0;
    const nmissing = 0; let i = 0; let
      j = 0;
    for (; i < argIds.length && j < np; i++) {
      let param = null;
      for (; j < np; j++) {
        param = `arg_${result.params[j]}`;
        if (result[param].type == 'missing') break;
      }
      if (j == np) break;
      const arg = semant.hydrate(nodes, nodes.get(argIds[i]));
      result[param] = arg;
    }
    if (i != argIds.length) {
      return ['error', expr.id, 'Not enough holes for the supplied arguments'];
    }
    return core.makeResult(expr, result, semant);
  },
  projection: {
    type: 'dynamic',
    field: (state, exprId) => {
      const name = state.nodes.get(exprId).fields.name;
      if (state.globals.has(name)) {
        return 'enabled';
      }
      return 'default';
    },
    default: {
      type: 'hbox',
      color: 'OrangeRed',
      radius: 0,
      shape: '()',
      strokeWhenChild: true,
      cols: [
        {
          type: 'text',
          text: '{name}',
          color: 'gray'
        },
        {
          type: 'generic',
          view: ['custom', 'argumentBar'],
          options: {}
        }
      ]
    },
    cases: {
      enabled: {
        type: 'hbox',
        color: 'OrangeRed',
        radius: 0,
        shape: '()',
        strokeWhenChild: true,
        cols: [
          {
            type: 'text',
            text: '{name}'
          },
          {
            type: 'generic',
            view: ['custom', 'argumentBar'],
            options: {}
          }
        ]
      }
    }
  }
};

export const reference = [
  baseReference,
  invocationReference
];
