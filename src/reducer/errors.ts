import { NodeId, ReductNode } from '@/semantics';

export class MissingNodeError extends Error {
  public slotId: NodeId;

  public constructor(slotId: NodeId) {
    super();
    this.slotId = slotId;
  }
}

type NodeType = ReductNode['type'];

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
