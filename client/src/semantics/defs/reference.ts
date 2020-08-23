import { BaseNode, NodeId } from '..';

/**
 * A node which represents a reference to another node.
 */
export interface ReferenceNode extends BaseNode {
  type: 'reference';
  fields: { target: NodeId; };
}
