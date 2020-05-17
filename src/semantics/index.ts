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
    DynVarNode
} from './defs';

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
    parent: NodeId;

    /**
     * The field in the parent node which this node
     * occupies.
     */
    parentField: string;

    type: string;

    fadeLevel: number;

    lockeed: boolean;

    complete: boolean;
}

export type NodeMap = ImMap<NodeId, Im<ReductNode>>;

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
    DynVarNode;
