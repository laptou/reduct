/* eslint-disable max-classes-per-file */
import { NodeId, ReductNode } from '@/semantics';

/**
 * This error is thrown when the user tries to eval/step an expression with
 * missing information.
 */
export class MissingNodeError extends Error {
  public slotId: NodeId;

  public constructor(slotId: NodeId) {
    super();
    this.slotId = slotId;
  }
}

type NodeType = ReductNode['type'];

/**
 * This error is thrown when the user tries to use a node of the wrong type in
 * an operation (i.e., using the > operator on strings).
 */
export class WrongTypeError extends Error {
  /**
   * The ID of the node whose type is unacceptable.
   */
  public nodeId: NodeId;

  /**
   * Types of nodes that would have been accepted in this location.
   */
  public expected: Array<NodeType>;

  /**
   * Type of node that was found.
   */
  public actual: NodeType;

  public constructor(nodeId: NodeId, expected: NodeType | Array<NodeType>, actual: NodeType) {
    super();
    this.nodeId = nodeId;
    this.expected = Array.isArray(expected) ? expected : [expected];
    this.actual = actual;
  }
}

/**
 * This error is thrown when the user tries to eval/step an expression that is
 * not on the board.
 */
export class NotOnBoardError extends Error {
  public nodeId: NodeId;

  public constructor(nodeId: NodeId) {
    super();
    this.nodeId = nodeId;
  }
}
