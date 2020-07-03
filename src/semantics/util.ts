import { dethunk, DRF, DeepReadonly } from '@/util/helper';
import { nextId } from '@/util/nodes';
import { NodeMap, BaseNode, ReductNode } from '.';
import { apply } from './defs/apply';
import { array } from './defs/array';
import { autograder } from './defs/autograder';
import { binop, op } from './defs/binop';
import { conditional } from './defs/conditional';
import { define } from './defs/define';
import { lambda, lambdaArg, lambdaVar } from './defs/lambda';
import { letExpr } from './defs/letExpr';
import { member } from './defs/member';
import { missing } from './defs/missing';
import { not } from './defs/not';
import { reference } from './defs/reference';
import {
  boolean, BoolNode, dynamicVariant, number, string, symbol, unsol, NumberNode, StrNode 
} from './defs/value';
import { RState } from '@/reducer/state';

/**
 * Creates a partial node. Helper for "create node" functions to avoid
 * repetition.
 * @param type The type of node being created.
 */
function createNodeBase() {
  return { 
    id: nextId(),
    locked: true, 
    fields: {}, 
    subexpressions: {},
    parent: null,
    parentField: null,
    fadeLevel: 0
  }
}

export function createBoolNode(value: boolean): BoolNode {
  return {
    ...createNodeBase(),
    type: 'boolean',
    fields: { value }
  };
}

export function createNumberNode(value: number): NumberNode {
  return {
    ...createNodeBase(),
    type: 'number',
    fields: { value }
  };
}

export function createStrNode(value: string): StrNode {
  return {
    ...createNodeBase(),
    type: 'string',
    fields: { value }
  };
}

/**
 * What kind of expression (``value``, ``expression``, ``statement``,
 * ``syntax``, or ``placeholder``). This is important—only an
 * ``expression`` can be clicked on, for instance, and reaching a
 * ``value`` will stop evaluation!
 */
export type NodeKind = 'expression' | 'placeholder' | 'value' | 'statement' | 'syntax';

export function getKindForNode(node: DRF, nodes: DeepReadonly<NodeMap>): NodeKind {
  switch (node.type) {
  case 'apply': return dethunk(apply.kind, node, nodes);
  case 'autograder': return dethunk(autograder.kind, node, nodes);
  case 'array': return dethunk(array.kind, node, nodes);
  case 'binop': return dethunk(binop.kind, node, nodes);
  case 'boolean': return dethunk(boolean.kind, node, nodes);
  case 'conditional': return dethunk(conditional.kind, node, nodes);
  case 'define': return dethunk(define.kind, node, nodes);
  case 'dynamicVariant': return dethunk(dynamicVariant.kind, node, nodes);
  case 'lambda': return dethunk(lambda.kind, node, nodes);
  case 'lambdaArg': return dethunk(lambdaArg.kind, node, nodes);
  case 'lambdaVar': return dethunk(lambdaVar.kind, node, nodes);
  case 'lambdaVar': return dethunk(lambdaVar.kind, node, nodes);
  case 'letExpr': return dethunk(letExpr.kind, node, nodes);
  case 'member': return dethunk(member.kind, node, nodes);
  case 'missing': return dethunk(missing.kind, node, nodes);
  case 'not': return dethunk(not.kind, node, nodes);
  case 'number': return dethunk(number.kind, node, nodes);
  case 'op': return dethunk(op.kind, node, nodes);
  case 'reference': return dethunk(reference[0].kind, node, nodes);
  case 'string': return dethunk(string.kind, node, nodes);
  case 'symbol': return dethunk(symbol.kind, node, nodes);
  case 'unsol': return dethunk(unsol.kind, node, nodes);
  case 'vtuple': return 'expression';
  default: throw new Error(`unknown node of type ${node.type}`);
  }
}
