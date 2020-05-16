
export type RId = number;

/**
 * RNode is a Reduct node, any item that exists
 * on the board, in the toolbox, in the goal box,
 * or in the defs box.
 */
export interface RNode {
  /** The ID of this node. */
  id: RId;

  /** The ID of this node's parent. */
  parent: RId;

  /**
   * The field in the parent node which this node
   * occupies.
   */
  parentField: string;

  type: string;
}
