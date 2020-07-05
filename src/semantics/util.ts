import { RState } from '@/store/state';
import { DeepReadonly, dethunk, DRF } from '@/util/helper';
import { nextId } from '@/util/nodes';
import {
  Flat, NodeId, NodeMap, ReductNode 
} from '.';
import { PTupleNode, VTupleNode } from './defs';
import { apply, ApplyNode } from './defs/apply';
import { array, ArrayNode } from './defs/array';
import { autograder } from './defs/autograder';
import {
  binop, BinOpNode, op, OpNode 
} from './defs/binop';
import { BuiltInReferenceNode } from './defs/builtins';
import { conditional, ConditionalNode } from './defs/conditional';
import { define, DefineNode } from './defs/define';
import { LambdaArgNode, LambdaNode, LambdaVarNode } from './defs/lambda';
import { letExpr } from './defs/letExpr';
import { member, MemberNode } from './defs/member';
import { missing, MissingNode } from './defs/missing';
import { not, NotNode } from './defs/not';
import { reference, ReferenceNode } from './defs/reference';
import {
  boolean, BoolNode, dynamicVariant, number, NumberNode, ReductSymbol, string, StrNode, symbol, SymbolNode, unsol 
} from './defs/value';

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

export function createPtupleNode(...children: ReductNode[]): PTupleNode {
  return {
    ...createNodeBase(),
    type: 'ptuple',
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
    fields: { name, functionHole: false, value: null }
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

export function createLambdaNode(arg: PTupleNode, body: ReductNode): LambdaNode {
  return {
    ...createNodeBase(),
    type: 'lambda',
    subexpressions: { arg, body }
  };
}

export function createApplyNode(callee: ReductNode, argument: PTupleNode): ApplyNode {
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

export function createArrayNode(...items: Array<NodeId>): Flat<ArrayNode>;
export function createArrayNode(...items: Array<DeepReadonly<ReductNode>>): Flat<ArrayNode>;
export function createArrayNode(...items: Array<NodeId | DeepReadonly<ReductNode>>): ArrayNode | Flat<ArrayNode> {
  return {
    ...createNodeBase(),
    type: 'array',
    fields: { length: items.length },
    subexpressions: Object.fromEntries(items.map((item, index) => [index, item])) as any
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

export function createReferenceNode(name: string): ReferenceNode {
  return {
    ...createNodeBase(),
    type: 'reference',
    fields: { name }
  };
}

export function createBuiltInReferenceNode(name: string): BuiltInReferenceNode {
  return {
    ...createNodeBase(),
    type: 'builtin-reference',
    fields: { name }
  };
}

export function* iterateTuple<N extends ReductNode>(
  tupleNode: NodeId | DRF<VTupleNode | PTupleNode>, 
  nodes: DeepReadonly<NodeMap>
): Generator<DRF<N>> {
  if (typeof tupleNode === 'number')
    tupleNode = nodes.get(tupleNode) as DRF<VTupleNode | PTupleNode>;

  for (let i = 0; i < tupleNode.fields.size; i++) {
    yield nodes.get(tupleNode.subexpressions[i]) as DRF<N>;
  }
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
  case 'lambda': {
    // lambda nodes with unbound arguments should be treated as values
    // because you can't step them; lambda nodes that are fully bound
    // should be treated as expressions

    let foundUnbound = false;
    for (const argNode of iterateTuple<LambdaArgNode>(node.subexpressions.arg, nodes)) {
      if (argNode.fields.value === null) {
        foundUnbound = true;
        break;
      }
    }

    if (!foundUnbound) return 'expression';

    return 'value';
  }
  case 'lambdaArg': return 'syntax';
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
  case 'ptuple':
  case 'vtuple': {
    for (const child of iterateTuple(node, nodes)) {
      if (getKindForNode(child, nodes) === 'expression')
        return 'expression';
    }

    return 'value';
  }
  case 'builtin-reference': return 'value';
  default: throw new Error(`unknown node of type ${node.type}`);
  }
}

/**
 * Searches for `name` in the scope of `node`.
 *
 * @param name The name to look for in the scope of `node`.
 * @param node The node where we should begin searching for the definition of
 * `name`.
 * @param state The current game state.
 * @returns The ID of the node which corresponds to `name` in the current scope,
 * or null if there is no such node.
 */
export function getDefinitionForName(
  name: string, 
  node: DRF, 
  state: DeepReadonly<RState>
): NodeId | null {
  let current = node;

  while (current) {
    if ('scope' in current) {
    // TODO: implement scope
    }

    // special case for lambda arg nodes until scope is implemented
    if (current.type === 'lambda') {
      for (const argNode of iterateTuple<LambdaArgNode>(current.subexpressions.arg, state.nodes)) {
        // we found something with this name
        if (argNode.fields.name === name) {
          return argNode.id;
        }
      }
    }

    if (!current.parent)
      break;

    current = state.nodes.get(current.parent)!;
  }

  if (state.globals.has(name)) {
    return state.globals.get(name)!;
  }

  return null;
}


/**
 * Searches for `name` in the scope of `node`. If it is found, returns the
 * corresponding value. This is different from getDefinitionForName because it
 * will return the body of a definition node instead of the definition node
 * itself.
 *
 * @param name The name to look for in the scope of `node`.
 * @param node The node where we should begin searching for the definition of
 * `name`.
 * @param state The current game state.
 * @returns The ID of the node which corresponds to `name` in the current scope,
 * or null if there is no such node.
 */
export function getValueForName(
  name: string, 
  node: DRF, 
  state: DeepReadonly<RState>
): NodeId | null {
  const definitionId = getDefinitionForName(name, node, state);
  if (definitionId === null) return null;

  const definitionNode = state.nodes.get(definitionId)!;
  if (definitionNode.type === 'define')
    return definitionNode.subexpressions.body;

  if (definitionNode.type === 'lambdaArg')
    return definitionNode.fields.value;

  return definitionNode.id;
}
