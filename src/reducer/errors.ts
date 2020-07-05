/* eslint-disable max-classes-per-file */
import { NodeId, ReductNode } from '@/semantics';

/**
 * Represents an error that occurred while attempting to perform an operation on
 * a node. Subclasses of this class are only to be thrown when the error occurs
 * due to the user doing something invalid (i.e., trying to add two booleans)
 * and not when something unexpected happens. They will be caught by the undo
 * reducer and stored so that they can be displayed in the interface.
 */
export class NodeError extends Error {
  /**
   * The node that is the source of this error.
   */
  public target: NodeId;

  public constructor(target: NodeId) {
    super();
    this.target = target;
  }
}

/**
 * This error is thrown when the user tries to eval/step an expression with
 * missing information.
 */
export class MissingNodeError extends NodeError {
  public constructor(slotId: NodeId) {
    super(slotId);
  }
}

type NodeType = ReductNode['type'];

/**
 * This error is thrown when the user tries to use a node of the wrong type in
 * an operation (i.e., using the > operator on strings).
 */
export class WrongTypeError extends NodeError {
  /**
   * Types of nodes that would have been accepted in this location.
   */
  public expected: Array<NodeType>;

  /**
   * Type of node that was found.
   */
  public actual: NodeType;

  public constructor(nodeId: NodeId, expected: NodeType | Array<NodeType>, actual: NodeType) {
    super(nodeId);
    this.expected = Array.isArray(expected) ? expected : [expected];
    this.actual = actual;
  }
}

/**
 * This error is thrown when the user tries to eval/step an expression that is
 * not on the board.
 */
export class NotOnBoardError extends NodeError {
  public constructor(nodeId: NodeId) {
    super(nodeId);
  }
}

/**
 * This error is thrown when the user tries to step a reference node that refers
 * to a name that is not in scope.
 */
export class UnknownNameError extends NodeError {
  /**
   * The name which was not found.
   */
  public name: string;

  public constructor(nodeId: NodeId, name: string) {
    super(nodeId);
    this.name = name;
  }
}
