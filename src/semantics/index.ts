import type { ImMap, Im } from '@/util/im';
import {
  ApplyNode,
  ArrayNode,
  AutograderNode,
  BinOpNode,
  OpNode,
  ConditionalNode,
  DefineNode,
  LambdaNode,
  LambdaVarNode,
  LambdaArgNode,
  LetNode,
  MemberNode,
  NotNode,
  NumberNode,
  StrNode,
  BoolNode,
  UnsolNode,
  DynVarNode,
  SymbolNode,
  InvocationNode,
  InvocationNode2
} from './defs';
import { VTupleNode } from './transform';

export type NodeId = number;

/**
 * BaseNode is a Reduct node, any item that exists
 * on the board, in the toolbox, in the goal box,
 * or in the defs box.
 */
export interface BaseNode {
    /** The ID of this node. */
    id: NodeId;

    /** The ID of this node's parent. */
    parent?: NodeId;

    /**
     * The field in the parent node which this node
     * occupies.
     */
    parentField: string;

    type: string;

    fadeLevel: number;

    locked: boolean;

    complete: boolean;
}

export type NodeType = {
    types: Map<NodeId, any>;
    complete: boolean;
}

export type NodeMap = ImMap<NodeId, Im<ReductNode>>;

export interface MissingNode extends BaseNode {
  type: 'missing';
  locked: true;
}

export type ReductNode =
    ApplyNode |
    ArrayNode |
    AutograderNode |
    BinOpNode |
    OpNode |
    ConditionalNode |
    DefineNode |
    LambdaNode |
    LambdaVarNode |
    LambdaArgNode |
    LetNode |
    MemberNode |
    NotNode |
    NumberNode |
    StrNode |
    BoolNode |
    UnsolNode |
    SymbolNode |
    DynVarNode |
    InvocationNode |
    InvocationNode2 |
    VTupleNode |
    MissingNode;
