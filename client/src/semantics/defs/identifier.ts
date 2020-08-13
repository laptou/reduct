import { BaseNode } from '..';

/**
 * A node which represents a reference to a name.
 */
export interface IdentifierNode extends BaseNode {
  type: 'identifier';
  fields: { name: string };
}
