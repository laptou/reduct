import type { PTupleNode, VTupleNode, VoidNode } from './defs';
import type { ApplyNode } from './defs/apply';
import type { ArrayNode } from './defs/array';
import type { BinOpNode, OpNode } from './defs/binop';
import type { BuiltInIdentifierNode } from './defs/builtins';
import type { ConditionalNode } from './defs/conditional';
import type { DefineNode } from './defs/define';
import type { LambdaArgNode, LambdaNode, LambdaVarNode } from './defs/lambda';
import type { MemberNode } from './defs/member';
import type { MissingNode } from './defs/missing';
import type { NotNode } from './defs/not';
import type { IdentifierNode } from './defs/identifier';
import type {
  BoolNode, NumberNode, ReductSymbol, StrNode, SymbolNode,
} from './defs/value';
import { NoteNode } from './defs/note';
import { ReferenceNode } from './defs/reference';

import type {
  Flat, NodeId, NodeMap, ReductNode,
} from '.';

import { nextId, isAncestorOf } from '@/util/nodes';
import type { DeepReadonly, DRF } from '@/util/helper';
import type { GameState } from '@/store/state';

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
    fadeLevel: 0,
  };
}

export function createBoolNode(value: boolean): BoolNode {
  return {
    ...createNodeBase(),
    type: 'boolean',
    fields: { value },
  };
}

export function createNumberNode(value: number): NumberNode {
  return {
    ...createNodeBase(),
    type: 'number',
    fields: { value },
  };
}

export function createStrNode(value: string): StrNode {
  return {
    ...createNodeBase(),
    type: 'string',
    fields: { value },
  };
}

export function createVtupleNode(...children: NodeId[]): Flat<VTupleNode>;
export function createVtupleNode(...children: ReductNode[]): VTupleNode;
export function createVtupleNode(...children: ReductNode[] | NodeId[]): VTupleNode | Flat<VTupleNode> {
  return {
    ...createNodeBase(),
    type: 'vtuple',
    locked: true,
    fields: { size: children.length },
    subexpressions: Object.fromEntries(children.map((child, index) => [index, child])),
  };
}

export function createPtupleNode(...children: NodeId[]): Flat<PTupleNode>;
export function createPtupleNode(...children: ReductNode[]): PTupleNode;
export function createPtupleNode(...children: ReductNode[] | NodeId[]): PTupleNode | Flat<PTupleNode> {
  return {
    ...createNodeBase(),
    type: 'ptuple',
    locked: true,
    fields: { size: children.length },
    subexpressions: Object.fromEntries(children.map((child, index) => [index, child])),
  };
}

export function createMissingNode(): MissingNode {
  return {
    ...createNodeBase(),
    type: 'missing',
    locked: true,
  };
}

export function createSymbolNode(kind: ReductSymbol): SymbolNode {
  return {
    ...createNodeBase(),
    type: 'symbol',
    fields: { name: kind },
  };
}

export function createLambdaVarNode(name: string): LambdaVarNode {
  return {
    ...createNodeBase(),
    type: 'lambdaVar',
    fields: { name },
  };
}

export function createLambdaArgNode(name: string): LambdaArgNode {
  return {
    ...createNodeBase(),
    type: 'lambdaArg',
    fields: {
      name,
      functionHole: false,
      value: null,
    },
  };
}

export function createBinOpNode(left: ReductNode, op: OpNode, right: ReductNode): BinOpNode {
  return {
    ...createNodeBase(),
    type: 'binop',
    subexpressions: {
      left,
      op,
      right,
    },
  };
}

export function createOpNode(name: OpNode['fields']['name']): OpNode {
  return {
    ...createNodeBase(),
    type: 'op',
    locked: true,
    fields: { name },
  };
}

export function createLambdaNode(arg: PTupleNode, body: ReductNode): LambdaNode {
  return {
    ...createNodeBase(),
    type: 'lambda',
    subexpressions: {
      arg,
      body,
    },
  };
}

export function createLetNode(variable: IdentifierNode, e1: ReductNode, e2: ReductNode): LetNode {
  return {
    ...createNodeBase(),
    type: 'let',
    subexpressions: {
      variable,
      value: e1,
      body: e2,
    },
  };
}

export function createNoteNode(text: string): NoteNode {
  return {
    ...createNodeBase(),
    type: 'note',
    fields: { text },
  };
}

export function createApplyNode(callee: ReductNode, argument: PTupleNode): ApplyNode;
export function createApplyNode(callee: NodeId, argument: NodeId): Flat<ApplyNode>;
export function createApplyNode(
  callee: NodeId | ReductNode,
  argument: NodeId | PTupleNode
): ApplyNode | Flat<ApplyNode> {
  return {
    ...createNodeBase(),
    type: 'apply',
    subexpressions: {
      callee,
      argument,
    },
  };
}

export function createConditionalNode(
  condition: ReductNode,
  positive: ReductNode,
  negative: ReductNode
): ConditionalNode;
export function createConditionalNode(
  condition: NodeId,
  positive: NodeId,
  negative: NodeId
): Flat<ConditionalNode>;
export function createConditionalNode(
  condition: ReductNode | NodeId,
  positive: ReductNode | NodeId,
  negative: ReductNode | NodeId
): ConditionalNode | Flat<ConditionalNode> {
  return {
    ...createNodeBase(),
    type: 'conditional',
    subexpressions: {
      condition,
      positive,
      negative,
    },
  };
}

export function createArrayNode(
  ...items: Array<NodeId>
): Flat<ArrayNode>;
export function createArrayNode(
  ...items: Array<DeepReadonly<ReductNode>>
): ArrayNode;
export function createArrayNode(
  ...items: Array<NodeId | DeepReadonly<ReductNode>>
): ArrayNode | Flat<ArrayNode> {
  return {
    ...createNodeBase(),
    type: 'array',
    fields: { length: items.length },
    subexpressions: Object.fromEntries(items.map((item, index) => [index, item])) as any,
  };
}

export function createNotNode(value: ReductNode): NotNode;
export function createNotNode(value: NodeId): Flat<NotNode>;
export function createNotNode(value: ReductNode | NodeId): NotNode | Flat<NotNode> {
  return {
    ...createNodeBase(),
    type: 'not',
    subexpressions: { value },
  };
}

export function createMemberNode(array: ReductNode, index: ReductNode): MemberNode {
  return {
    ...createNodeBase(),
    type: 'member',
    subexpressions: {
      array,
      index,
    },
  };
}

export function createDefineNode(name: string, params: string[], body: LambdaNode): DefineNode {
  return {
    ...createNodeBase(),
    type: 'define',
    fields: {
      name,
      params,
    },
    subexpressions: { body },
  };
}

export function createReferenceNode(targetId: NodeId): ReferenceNode;
export function createReferenceNode(targetId: NodeId): Flat<ReferenceNode>;
export function createReferenceNode(targetId: NodeId): ReferenceNode | Flat<ReferenceNode> {
  return {
    ...createNodeBase(),
    type: 'reference',
    fields: { target: targetId },
  };
}

export function createIdentifierNode(name: string): IdentifierNode {
  return {
    ...createNodeBase(),
    type: 'identifier',
    fields: { name },
  };
}

export function createBuiltInIdentifierNode(name: string): BuiltInIdentifierNode {
  return {
    ...createNodeBase(),
    type: 'builtin',
    fields: { name },
  };
}

export function createVoidNode(): VoidNode {
  return {
    ...createNodeBase(),
    type: 'void',
    fields: {},
  };
}

export function * iterateTuple<N extends ReductNode>(
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
  case 'apply':
  case 'let':
  case 'binop':
  case 'conditional':
  case 'member':
  case 'not':
  case 'identifier':
    return 'expression';

  case 'ptuple':
  case 'vtuple':
  case 'array': {
    for (const childId of Object.values(node.subexpressions)) {
      const child = nodes.get(childId)!;
      const childKind = getKindForNode(child, nodes);
      if (childKind === 'expression' || childKind === 'placeholder')
        return 'expression';
    }

    return 'value';
  }

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

  case 'boolean':
  case 'number':
  case 'string':
  case 'symbol':
  case 'unsol':
  case 'reference':
  case 'builtin':
    return 'value';

  case 'define':
    return 'statement';

  case 'lambdaArg':
  case 'op':
  case 'note':
  case 'void':
    return 'syntax';

  case 'missing':
    return 'placeholder';

  default: throw new Error(`unknown node of type ${node.type}`);

  // TODO: reintroduce autograder?
  // case 'autograder': return dethunk(autograder.kind, node, nodes);
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
  state: DeepReadonly<GameState>
): NodeId | null {
  let current: DRF | undefined = node;

  // traverse the tree of nodes to find if 'name' is in the scope
  while (current) {
    if (current.type === 'lambda') {
      for (const argNode of iterateTuple<LambdaArgNode>(current.subexpressions.arg, state.nodes)) {
        // we found something with this name
        if (argNode.fields.name === name) {
          return argNode.id;
        }
      }
    }

    // example: let x = (x + x) in { ... }
    // should not cause recursion, which means that we skip the let node if the node we
    // started at is part of the let node's value
    if (current.type === 'let' && !isAncestorOf(node.id, current.subexpressions.value, state.nodes)) {
      const varNode = state.nodes.get(current.subexpressions.variable)! as DRF<IdentifierNode>;
      if (varNode.fields.name === name) {
        return current.id;
      }
    }

    if (!current.parent)
      break;

    current = state.nodes.get(current.parent);
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
  state: DeepReadonly<GameState>
): NodeId | null {
  const definitionId = getDefinitionForName(name, node, state);
  if (definitionId === null) return null;

  const definitionNode = state.nodes.get(definitionId)!;

  if (definitionNode.type === 'define')
    return definitionNode.subexpressions.body;

  if (definitionNode.type === 'lambdaArg')
    return definitionNode.fields.value;

  if (definitionNode.type === 'let')
    return definitionNode.subexpressions.value;

  return definitionNode.id;
}

/**
 * Gets the order in which a node's children should be reduced before the node
 * itself is reduced.
 *
 * @param node The node whose children are being reduced.
 * @returns An array of child fields to be reduced, in order.
 */
export function getReductionOrderForNode<N extends DRF>(node: N): string[] {
  switch (node.type) {
  case 'apply':
    return ['callee', 'argument'];

  case 'let':
    return ['value', 'body'];

  // for conditional nodes, we don't want to step the contents of the if
  // block or the else block, we just want to evaluate the condition and
  // then return one of the blocks
  case 'conditional':
    return ['condition'];

  default:
    return Object.keys(node.subexpressions);
  }
}
