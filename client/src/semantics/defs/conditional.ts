import type { BaseNode, ReductNode } from '..';

/**
 * ConditionalNode is a reduct node representing an conditional expression
 */
export interface ConditionalNode extends BaseNode {
  type: 'conditional';
  subexpressions: {
    condition: ReductNode;
    positive: ReductNode;
    negative: ReductNode;
  };
}
