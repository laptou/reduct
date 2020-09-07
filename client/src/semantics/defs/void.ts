import { BaseNode, NodeId } from '..';

/**
 * A node which represents the absence of a value.
 */
export interface VoidNode extends BaseNode {
  type: 'void';
  fields: Record<never, never>;
}
