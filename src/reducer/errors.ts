import { NodeId } from '@/semantics';

export class MissingNodeError extends Error {
  public slotId: NodeId;

  public constructor(slotId: NodeId) {
    super();
    this.slotId = slotId;
  }
}

type NodeType = 'string' | 'number' | 'boolean' | 'symbol';

export class WrongTypeError extends Error {
  public nodeId: NodeId;

  public expected: NodeType;

  public actual: NodeType;

  public constructor(nodeId: NodeId, expected: NodeType, actual: NodeType) {
    super();
    this.nodeId = nodeId;
    this.expected = expected;
    this.actual = actual;
  }
}
