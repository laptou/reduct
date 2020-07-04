import { DeepReadonly, dethunk, DRF } from '@/util/helper';
import { nextId } from '@/util/nodes';
import { NodeMap, ReductNode } from '.';
import { apply, ApplyNode } from './defs/apply';
import { array, ArrayNode } from './defs/array';
import { autograder } from './defs/autograder';
import {
  binop, BinOpNode, op, OpNode 
} from './defs/binop';
import { conditional, ConditionalNode } from './defs/conditional';
import { define, DefineNode } from './defs/define';
import {
  lambda, lambdaArg, LambdaArgNode, LambdaNode, lambdaVar, LambdaVarNode 
} from './defs/lambda';
import { letExpr } from './defs/letExpr';
import { member, MemberNode } from './defs/member';
import { missing, MissingNode } from './defs/missing';
import { not, NotNode } from './defs/not';
import { reference } from './defs/reference';
import {
  boolean, BoolNode, dynamicVariant, number, NumberNode, ReductSymbol, string, StrNode, symbol, SymbolNode, unsol 
} from './defs/value';
import { VTupleNode } from './transform';

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

export function createVtupleNode(...children: ReductNode[]): VTupleNode {
  return {
    ...createNodeBase(),
    type: 'vtuple',
    locked: true,
    fields: { size: children.length },
    subexpressions: Object.fromEntries(children.map((child, index) => [index, child]))
  };
}

export function createMissingNode(): MissingNode {
  return {
    ...createNodeBase(),
    type: 'missing',
    locked: true
  };
}

export function createSymbolNode(kind: ReductSymbol): SymbolNode {
  return {
    ...createNodeBase(),
    type: 'symbol',
    fields: { name: kind }
  };
}

export function createLambdaVarNode(name: string): LambdaVarNode {
  return {
    ...createNodeBase(),
    type: 'lambdaVar',
    fields: { name }
  };
}

export function createLambdaArgNode(name: string): LambdaArgNode {
  return {
    ...createNodeBase(),
    type: 'lambdaArg',
    fields: { name, functionHole: false }
  };
}

export function createBinOpNode(left: ReductNode, op: OpNode, right: ReductNode): BinOpNode {
  return {
    ...createNodeBase(),
    type: 'binop',
    subexpressions: { left, op, right }
  };
}

export function createOpNode(name: OpNode['fields']['name']): OpNode {
  return {
    ...createNodeBase(),
    type: 'op',
    locked: true,
    fields: { name }
  };
}

export function createLambdaNode(arg: LambdaArgNode, body: ReductNode): LambdaNode {
  return {
    ...createNodeBase(),
    type: 'lambda',
    subexpressions: { arg, body }
  };
}

export function createApplyNode(callee: ReductNode, argument: ReductNode): ApplyNode {
  return {
    ...createNodeBase(),
    type: 'apply',
    subexpressions: { callee, argument }
  };
}

export function createConditionalNode(condition: ReductNode, positive: ReductNode, negative: ReductNode): ConditionalNode {
  return {
    ...createNodeBase(),
    type: 'conditional',
    subexpressions: { condition, positive, negative }
  };
}

export function createArrayNode(...items: ReductNode[]): ArrayNode {
  return {
    ...createNodeBase(),
    type: 'array',
    fields: { length: items.length },
    subexpressions: Object.fromEntries(items.map((item, index) => [index, item]))
  };
}

export function createNotNode(value: ReductNode): NotNode {
  return {
    ...createNodeBase(),
    type: 'not',
    subexpressions: { value }
  };
}

export function createMemberNode(array: ReductNode, index: ReductNode): MemberNode {
  return {
    ...createNodeBase(),
    type: 'member',
    subexpressions: { array, index }
  };
}

export function createDefineNode(name: string, params: string[], body: LambdaNode): DefineNode {
  return {
    ...createNodeBase(),
    type: 'define',
    fields: { name, params },
    subexpressions: { body }
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
