import type { BaseNode, ReductNode } from '..';

/**
 * MemberNode represents indexing into an array.
 */
export interface MemberNode extends BaseNode {
  type: 'member';

  subexpressions: {
    array: ReductNode;
    index: ReductNode;
  };
}
