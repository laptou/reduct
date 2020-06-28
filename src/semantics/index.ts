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
import { DeepReadonly } from '@/util/helper';

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
    parent?: NodeId | null;

    /**
     * The field in the parent node which this node
     * occupies.
     */
    parentField?: string | null;

    type: string;

    fadeLevel: number;

    locked: boolean;

    complete?: boolean;

    fields: Record<string | number, any>;
    
    subexpressions: {};

    __meta?: NodeMetadata;
}

export type Flat<N extends BaseNode> = { 
  [K in keyof N]: K extends 'subexpressions' ? Record<keyof N['subexpressions'], NodeId> : N[K];
};

export interface NodeMetadata {
  toolbox: { 
    /** 
     * True if this node does not deplete when it is picked from the toolbox
     * (i.e., the user can use it an unlimited number of times.) 
     * */
    unlimited: boolean; 
  };
}

export type NodeType = {
    types: Map<NodeId, any>;
    complete: boolean;
}

export type NodeMap = Map<NodeId, DeepReadonly<FlatReductNode>>;

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

export type FlatReductNode =
  Flat<ApplyNode> |
  Flat<ArrayNode> |
  Flat<AutograderNode> |
  Flat<BinOpNode> |
  Flat<OpNode> |
  Flat<ConditionalNode> |
  Flat<DefineNode> |
  Flat<LambdaNode> |
  Flat<LambdaVarNode> |
  Flat<LambdaArgNode> |
  Flat<LetNode> |
  Flat<MemberNode> |
  Flat<NotNode> |
  Flat<NumberNode> |
  Flat<StrNode> |
  Flat<BoolNode> |
  Flat<UnsolNode> |
  Flat<SymbolNode> |
  Flat<DynVarNode> |
  Flat<InvocationNode> |
  Flat<InvocationNode2> |
  Flat<VTupleNode> |
  Flat<MissingNode>;
