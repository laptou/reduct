import type { BaseNode, ReductNode } from '..';

/**
 * ArrayNode is a Reduct node that represents an array of nodes with length 'length'
 */
export interface ArrayNode extends BaseNode {
  type: 'array';

  fields: { length: number };
  subexpressions: Record<number, ReductNode>;
}
